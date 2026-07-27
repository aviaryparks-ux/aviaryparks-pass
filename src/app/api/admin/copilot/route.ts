import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Helper: Format Rupiah
function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

// Helper: Group data by month
function groupByMonth(items: any[], dateField: string, amountField?: string) {
  const groups: Record<string, { count: number; total: number }> = {};
  items.forEach(item => {
    const d = new Date(item[dateField]);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = { count: 0, total: 0 };
    groups[key].count++;
    if (amountField) groups[key].total += Number(item[amountField]) || 0;
  });
  return groups;
}

// Helper: Get today's data
function filterToday(items: any[], dateField: string) {
  const today = new Date().toLocaleDateString('id-ID');
  return items.filter(item => new Date(item[dateField]).toLocaleDateString('id-ID') === today);
}

// Helper: Get this week's data
function filterThisWeek(items: any[], dateField: string) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return items.filter(item => new Date(item[dateField]) >= weekAgo);
}

// Helper: Get this month's data
function filterThisMonth(items: any[], dateField: string) {
  const now = new Date();
  return items.filter(item => {
    const d = new Date(item[dateField]);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
}

// Generate CSV content from data
function generateCSV(headers: string[], rows: string[][]): string {
  const csvRows = [headers.join(';')];
  rows.forEach(row => csvRows.push(row.join(';')));
  return '\uFEFF' + csvRows.join('\n');
}

async function fetchAllData() {
  const [membersRes, transactionsRes, visitsRes, posRes, pointsRes] = await Promise.all([
    supabaseAdmin.from('members').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('transactions').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('visits').select('*').order('visited_at', { ascending: false }),
    supabaseAdmin.from('pos_transactions').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('point_mutations').select('*').order('created_at', { ascending: false }),
  ]);

  return {
    members: membersRes.data || [],
    transactions: transactionsRes.data || [],
    visits: visitsRes.data || [],
    pos: posRes.data || [],
    points: pointsRes.data || [],
  };
}

function buildDataSummary(data: any) {
  const { members, transactions, visits, pos, points } = data;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Members
  const activeMembers = members.filter((m: any) => m.status === 'ACTIVE');
  const pendingMembers = members.filter((m: any) => m.status === 'PENDING_PAYMENT');

  // Transactions (tiket)
  const paidTransactions = transactions.filter((t: any) => t.status === 'SUCCESS' || t.status === 'PAID');
  const totalTicketRevenue = paidTransactions.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
  const ticketByMonth = groupByMonth(paidTransactions, 'created_at', 'amount');
  const todayTicket = filterToday(paidTransactions, 'created_at');
  const weekTicket = filterThisWeek(paidTransactions, 'created_at');
  const monthTicket = filterThisMonth(paidTransactions, 'created_at');

  // POS
  const totalPosRevenue = pos.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
  const posByMonth = groupByMonth(pos, 'created_at', 'amount');
  const todayPos = filterToday(pos, 'created_at');
  const weekPos = filterThisWeek(pos, 'created_at');
  const monthPos = filterThisMonth(pos, 'created_at');

  // POS by location
  const posByLocation: Record<string, number> = {};
  pos.forEach((t: any) => {
    const loc = t.location || 'Unknown';
    posByLocation[loc] = (posByLocation[loc] || 0) + (Number(t.amount) || 0);
  });

  // POS by terminal name (nama kasir/mesin)
  const posByTerminal: Record<string, { count: number; total: number }> = {};
  pos.forEach((t: any) => {
    const terminal = t.terminal_name || t.location || 'Unknown';
    if (!posByTerminal[terminal]) posByTerminal[terminal] = { count: 0, total: 0 };
    posByTerminal[terminal].count++;
    posByTerminal[terminal].total += Number(t.amount) || 0;
  });

  // 10 transaksi POS terakhir dengan nama member
  const recentPosDetails = pos.slice(0, 10).map((t: any) => {
    const member = members.find((m: any) => m.id === t.member_id);
    return `${member?.name || 'Unknown'} belanja ${formatRp(Number(t.amount))} di ${t.terminal_name || t.location || '-'} (${new Date(t.created_at).toLocaleDateString('id-ID')})`;
  });

  // Visits - unique per day
  const uniqueVisitsPerDay: Record<string, Set<string>> = {};
  visits.forEach((v: any) => {
    const day = new Date(v.visited_at).toLocaleDateString('id-ID');
    if (!uniqueVisitsPerDay[day]) uniqueVisitsPerDay[day] = new Set();
    if (v.member_id) uniqueVisitsPerDay[day].add(v.member_id);
  });
  const todayVisitors = uniqueVisitsPerDay[now.toLocaleDateString('id-ID')]?.size || 0;
  const totalUniqueVisitors = new Set(visits.map((v: any) => v.member_id).filter(Boolean)).size;

  // Visit frequency per member
  const visitCount: Record<string, number> = {};
  visits.forEach((v: any) => {
    if (v.member_id) visitCount[v.member_id] = (visitCount[v.member_id] || 0) + 1;
  });
  const topVisitors = Object.entries(visitCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => {
      const m = members.find((m: any) => m.id === id);
      return `${m?.name || 'Unknown'}: ${count}x`;
    });

  // Member list with details
  const memberList = members.slice(0, 30).map((m: any) => {
    const vc = visitCount[m.id] || 0;
    return `${m.name} (${m.status}, ${vc}x kunjungan, ${m.points_balance || 0} poin)`;
  });

  // Monthly breakdown string
  const monthlyBreakdown = Object.entries(ticketByMonth)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6)
    .map(([month, d]) => `${month}: ${d.count} transaksi, ${formatRp(d.total)}`);

  const posMonthlyBreakdown = Object.entries(posByMonth)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6)
    .map(([month, d]) => `${month}: ${d.count} transaksi, ${formatRp(d.total)}`);

  return `=== DATA LENGKAP DATABASE AVIARY PARK (Real-time) ===

📊 RINGKASAN MEMBER:
- Total member terdaftar: ${members.length}
- Member aktif (lunas): ${activeMembers.length}
- Member pending pembayaran: ${pendingMembers.length}

💰 PENDAPATAN TIKET:
- Hari ini: ${todayTicket.length} transaksi, ${formatRp(todayTicket.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0))}
- Minggu ini: ${weekTicket.length} transaksi, ${formatRp(weekTicket.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0))}
- Bulan ini: ${monthTicket.length} transaksi, ${formatRp(monthTicket.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0))}
- TOTAL SEPANJANG MASA: ${paidTransactions.length} transaksi, ${formatRp(totalTicketRevenue)}
- Rincian per bulan: ${monthlyBreakdown.join(' | ')}

🛒 PENDAPATAN POS (Kasir Resto/Souvenir):
- Hari ini: ${todayPos.length} transaksi, ${formatRp(todayPos.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0))}
- Minggu ini: ${weekPos.length} transaksi, ${formatRp(weekPos.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0))}
- Bulan ini: ${monthPos.length} transaksi, ${formatRp(monthPos.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0))}
- TOTAL SEPANJANG MASA: ${pos.length} transaksi, ${formatRp(totalPosRevenue)}
- Rincian per bulan: ${posMonthlyBreakdown.join(' | ')}
- Per lokasi kasir: ${Object.entries(posByLocation).map(([loc, amt]) => `${loc}: ${formatRp(amt)}`).join(', ')}
- Per terminal/mesin kasir: ${Object.entries(posByTerminal).map(([t, d]) => `${t}: ${d.count} transaksi, ${formatRp(d.total)}`).join(' | ')}
- 10 Transaksi POS terakhir (detail): ${recentPosDetails.join(' | ')}

💵 TOTAL PENDAPATAN GABUNGAN: ${formatRp(totalTicketRevenue + totalPosRevenue)}

👥 KUNJUNGAN:
- Pengunjung hari ini: ${todayVisitors} orang
- Total pengunjung unik sepanjang masa: ${totalUniqueVisitors} orang
- Total scan wajah tercatat: ${visits.length}x
- Top 5 pengunjung tersering: ${topVisitors.join(', ')}

👤 DAFTAR MEMBER (30 pertama):
${memberList.join('\n')}

🏆 POIN LOYALITAS:
- Total mutasi poin tercatat: ${points.length}
- 5 Transaksi tiket terakhir: ${paidTransactions.slice(0, 5).map((t: any) => `${t.buyer_name || '-'} - ${formatRp(Number(t.amount))} (${t.package_name || '-'}, ${new Date(t.created_at).toLocaleDateString('id-ID')})`).join(' | ')}`;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, context } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!groqKey && !geminiKey) {
      return NextResponse.json({ 
        reply: "⚠️ API Key belum diatur. Masukkan `GROQ_API_KEY` ke dalam file `.env.local`.\n\nDapatkan gratis di: https://console.groq.com/keys"
      });
    }

    // === QUERY DATABASE LANGSUNG ===
    const dbData = await fetchAllData();
    const dataSummary = buildDataSummary(dbData);

    // Cek apakah user minta export CSV
    const isExportRequest = /csv|excel|unduh|download|export|laporan.*excel|buat.*file/i.test(prompt);
    let csvAttachment = '';

    if (isExportRequest) {
      // Generate CSV dari data database
      const isPos = /pos|kasir|resto|souvenir/i.test(prompt);
      const isVisit = /kunjungan|visit|pengunjung/i.test(prompt);
      const isMember = /member|anggota|daftar/i.test(prompt);

      if (isPos) {
        const headers = ['Tanggal', 'Lokasi', 'Member ID', 'Jumlah'];
        const rows = dbData.pos.map((t: any) => [
          new Date(t.created_at).toLocaleDateString('id-ID'),
          t.location || '-',
          t.member_id || '-',
          String(t.amount)
        ]);
        csvAttachment = generateCSV(headers, rows);
      } else if (isVisit) {
        const headers = ['Tanggal', 'Waktu', 'Member ID', 'Similarity'];
        const rows = dbData.visits.map((v: any) => [
          new Date(v.visited_at).toLocaleDateString('id-ID'),
          new Date(v.visited_at).toLocaleTimeString('id-ID'),
          v.member_id || '-',
          String(v.similarity || '-')
        ]);
        csvAttachment = generateCSV(headers, rows);
      } else if (isMember) {
        const headers = ['Nama', 'Email', 'Phone', 'NIK', 'Status', 'Poin', 'Tanggal Daftar'];
        const rows = dbData.members.map((m: any) => [
          m.name || '-',
          m.email || '-',
          m.phone || '-',
          m.nik || '-',
          m.status || '-',
          String(m.points_balance || 0),
          new Date(m.created_at).toLocaleDateString('id-ID')
        ]);
        csvAttachment = generateCSV(headers, rows);
      } else {
        // Default: transaksi tiket
        const headers = ['Tanggal', 'Pembeli', 'Paket', 'Jumlah', 'Status', 'Order ID'];
        const rows = dbData.transactions.map((t: any) => [
          new Date(t.created_at).toLocaleDateString('id-ID'),
          t.buyer_name || '-',
          t.package_name || '-',
          String(t.amount),
          t.status || '-',
          t.merchant_order_id || '-'
        ]);
        csvAttachment = generateCSV(headers, rows);
      }
    }

    // Susun System Prompt
    const systemInstruction = `Anda adalah Aviary Assistant, AI Data Analyst khusus Aviary Park Indonesia.
Anda memiliki AKSES LANGSUNG ke seluruh database. Jawab berdasarkan data berikut:

${dataSummary}

ATURAN:
- Jawab SINGKAT, PADAT, TO THE POINT. Maksimal 3-4 kalimat.
- Langsung berikan angka/data tanpa basa-basi.
- Gunakan bullet point untuk banyak data.
- JANGAN bilang "sayangnya" atau "maaf" atau "saya tidak punya akses".
- Jika diminta laporan per bulan, gunakan data "Rincian per bulan" di atas.
- Jika diminta export/unduh CSV/Excel, jawab singkat bahwa file sedang diunduh.`;

    // === GROQ API ===
    if (groqKey) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt }
          ],
          temperature: 0.5,
          max_tokens: 500,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Groq API Error:", errorData);
        return NextResponse.json({ 
          reply: `Gagal terhubung ke Groq API.\nDetail: ${errorData.error?.message || JSON.stringify(errorData)}`
        });
      }

      const data = await response.json();
      let replyText = data.choices?.[0]?.message?.content || "Tidak bisa memproses jawaban.";

      return NextResponse.json({ 
        reply: replyText,
        ...(csvAttachment ? { csvData: csvAttachment } : {})
      });
    }

    // === GEMINI FALLBACK ===
    if (geminiKey) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${systemInstruction}\n\nPertanyaan: ${prompt}` }] }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json({ 
          reply: `Gagal terhubung ke Gemini API.\nDetail: ${errorData.error?.message || JSON.stringify(errorData)}`
        });
      }

      const data = await response.json();
      let replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Tidak bisa memproses jawaban.";

      return NextResponse.json({ 
        reply: replyText,
        ...(csvAttachment ? { csvData: csvAttachment } : {})
      });
    }

    return NextResponse.json({ reply: "Tidak ada API Key yang tersedia." });
  } catch (error) {
    console.error("Copilot API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
