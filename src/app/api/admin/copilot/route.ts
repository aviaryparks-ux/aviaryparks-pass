import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { parseNIK } from '@/lib/nikParser';

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY || '',
});

// Helper: Format Rupiah
function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!process.env.GROQ_API_KEY) {
      return new Response(JSON.stringify({ 
        error: "⚠️ API Key belum diatur. Masukkan `GROQ_API_KEY` ke dalam file `.env.local`."
      }), { status: 400 });
    }

    const result = await streamText({
      model: groq('llama-3.3-70b-versatile'),
      messages,
      system: `Anda adalah Aviary Assistant, AI Data Analyst dan Eksekutor khusus Aviary Park Indonesia.
Anda HANYA boleh menjawab pertanyaan terkait Aviary Park, tiket, pendapatan, pengunjung, dan operasional.
Anda memiliki akses ke berbagai tools (alat) untuk mengambil data langsung dari database secara real-time, menampilkan grafik, dan bahkan melakukan modifikasi data (approve member, tambah poin, dll).

ATURAN PENTING:
- Panggil tool/fungsi jika pertanyaan pengguna membutuhkan data yang belum Anda ketahui.
- Saat menjawab, JANGAN bertele-tele. Jawab dengan format yang rapi dan profesional.
- Jika pengguna meminta visualisasi data atau grafik tren (contoh: "Tampilkan grafik pendapatan bulan ini"), panggil tool \`renderChart\` untuk menampilkan grafik di antarmuka.
- Jika data member butuh umur atau daerah asal, sistem telah mengekstraknya menggunakan nikParser dari database, gunakan data tersebut dengan bijak.
- JANGAN PERNAH menampilkan/memberitahukan NIK lengkap ke pengguna, cukup sebutkan kota/tanggal lahirnya saja.
- Jadilah asisten yang proaktif. Jika pengguna bertanya tentang penurunan pendapatan, coba sarankan promo atau taktik pemasaran.`,
      tools: {
        getMemberAnalytics: tool({
          description: 'Ambil statistik dan daftar member, termasuk data umur, jenis kelamin, dan kota asal (berdasarkan NIK) serta pengunjung setia.',
          parameters: z.object({
            limit: z.number().describe('Batas jumlah member yang diambil (default 50)'),
            status: z.enum(['ACTIVE', 'PENDING_PAYMENT', 'ALL']).optional().describe('Filter berdasarkan status member')
          }),
          execute: async ({ limit = 50, status = 'ALL' }) => {
            let query = supabaseAdmin.from('members').select('*');
            if (status !== 'ALL') query = query.eq('status', status);
            
            const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
            if (error) return { error: error.message };

            // Augment with NIK parsed data
            const augmentedMembers = data?.map(m => {
              const nikData = m.nik ? parseNIK(m.nik) : null;
              return {
                id: m.id,
                name: m.name,
                status: m.status,
                points_balance: m.points_balance,
                age: nikData?.age,
                gender: nikData?.gender,
                province: nikData?.province,
                birthdayThisMonth: nikData?.birthdayThisMonth
              };
            });

            return {
              totalFetched: data?.length || 0,
              members: augmentedMembers
            };
          },
        }),
        getFinancialAnalytics: tool({
          description: 'Ambil data laporan keuangan, tren penjualan tiket, dan transaksi kasir (POS). Berguna untuk membuat grafik pendapatan.',
          parameters: z.object({
            type: z.enum(['TICKET', 'POS', 'ALL']).describe('Jenis transaksi (Tiket masuk atau POS Kasir)'),
            timeframe: z.enum(['TODAY', 'THIS_MONTH', 'ALL_TIME']).describe('Rentang waktu data')
          }),
          execute: async ({ type, timeframe }) => {
            const now = new Date();
            let startDate = new Date(0); // ALL_TIME
            
            if (timeframe === 'TODAY') {
              startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            } else if (timeframe === 'THIS_MONTH') {
              startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }

            let ticketRevenue = 0;
            let posRevenue = 0;
            let ticketData = [];
            let posData = [];

            if (type === 'TICKET' || type === 'ALL') {
              const { data } = await supabaseAdmin.from('transactions')
                .select('amount, created_at, status')
                .gte('created_at', startDate.toISOString())
                .in('status', ['PAID', 'SUCCESS']);
              ticketData = data || [];
              ticketRevenue = ticketData.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
            }

            if (type === 'POS' || type === 'ALL') {
              const { data } = await supabaseAdmin.from('pos_transactions')
                .select('amount, created_at, location')
                .gte('created_at', startDate.toISOString());
              posData = data || [];
              posRevenue = posData.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
            }

            return {
              timeframe,
              totalTicketRevenue: formatRp(ticketRevenue),
              totalPosRevenue: formatRp(posRevenue),
              totalTransactionsCount: ticketData.length + posData.length
            };
          },
        }),
        approvePendingMember: tool({
          description: 'Setujui (Approve) member yang berstatus PENDING_PAYMENT menjadi ACTIVE. Ini adalah fungsi aksi (WRITE).',
          parameters: z.object({
            memberName: z.string().describe('Nama member yang akan di-approve')
          }),
          execute: async ({ memberName }) => {
            const { data: members } = await supabaseAdmin.from('members')
              .select('id, name, status')
              .ilike('name', `%${memberName}%`)
              .eq('status', 'PENDING_PAYMENT')
              .limit(1);

            if (!members || members.length === 0) {
              return { success: false, message: `Member dengan nama mirip "${memberName}" berstatus PENDING_PAYMENT tidak ditemukan.` };
            }

            const target = members[0];
            const { error } = await supabaseAdmin.from('members')
              .update({ status: 'ACTIVE' })
              .eq('id', target.id);

            if (error) return { success: false, message: `Gagal menyetujui member: ${error.message}` };
            return { success: true, message: `Berhasil mengubah status ${target.name} menjadi ACTIVE.` };
          }
        }),
        addMemberPoints: tool({
          description: 'Berikan/tambahkan saldo poin loyalitas ke seorang member secara manual. Ini adalah fungsi aksi (WRITE).',
          parameters: z.object({
            memberName: z.string().describe('Nama member yang akan diberi poin'),
            points: z.number().describe('Jumlah poin yang akan ditambahkan')
          }),
          execute: async ({ memberName, points }) => {
            const { data: members } = await supabaseAdmin.from('members')
              .select('id, name, points_balance')
              .ilike('name', `%${memberName}%`)
              .limit(1);

            if (!members || members.length === 0) {
              return { success: false, message: `Member "${memberName}" tidak ditemukan.` };
            }

            const target = members[0];
            const newBalance = (target.points_balance || 0) + points;
            
            // Insert mutation log
            await supabaseAdmin.from('point_mutations').insert({
              member_id: target.id,
              mutation_type: 'EARN',
              points: points,
              description: 'Bonus Poin Manual via AI Copilot'
            });

            const { error } = await supabaseAdmin.from('members')
              .update({ points_balance: newBalance })
              .eq('id', target.id);

            if (error) return { success: false, message: `Gagal menambah poin: ${error.message}` };
            return { success: true, message: `Berhasil menambah ${points} poin ke ${target.name}. Saldo sekarang: ${newBalance}.` };
          }
        }),
        renderChart: tool({
          description: 'Render sebuah grafik (Bar Chart atau Line Chart) langsung di layar pengguna (Frontend). Jangan panggil tool ini jika Anda belum mengambil datanya terlebih dahulu.',
          parameters: z.object({
            type: z.enum(['bar', 'line', 'pie']).describe('Tipe grafik yang ingin digambar (bar, line, atau pie)'),
            title: z.string().describe('Judul grafik'),
            data: z.array(z.object({
              label: z.string().describe('Label pada sumbu X atau kategori'),
              value: z.number().describe('Nilai numerik')
            })).describe('Array data yang akan ditampilkan')
          })
        })
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Copilot AI SDK Error:", error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
