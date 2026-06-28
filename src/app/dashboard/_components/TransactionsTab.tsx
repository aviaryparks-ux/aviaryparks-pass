import React from 'react';

export default function TransactionsTab({ familyMembers }: { familyMembers: any[] }) {
  // Kelompokkan member berdasarkan tanggal pembuatan (created_at)
  // Ini mengasumsikan anggota yang didaftarkan pada waktu yang sama (atau berdekatan) adalah 1 transaksi
  
  const transactions: any[] = [];
  
  // Urutkan dari yang terbaru
  const sortedMembers = [...familyMembers].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const groupToleranceMs = 1000 * 60 * 5; // 5 menit toleransi

  sortedMembers.forEach(member => {
    // Cari apakah ada transaksi yang waktunya berdekatan
    const existingTx = transactions.find(tx => 
      Math.abs(new Date(tx.date).getTime() - new Date(member.created_at).getTime()) < groupToleranceMs
    );

    if (existingTx) {
      existingTx.members.push(member);
      // Jika ada PRIMARY di grup ini, set typenya jadi UTAMA
      if (member.role === 'PRIMARY') {
        existingTx.type = 'PEMBELIAN PAKET UTAMA';
      }
      // Status transaksi mengikuti status member terbaru/paling pending
      if (member.status === 'PENDING_PAYMENT') {
        existingTx.status = 'PENDING_PAYMENT';
      }
    } else {
      transactions.push({
        id: member.id, // Pakai ID member pertama sebagai ID Transaksi referensi
        date: member.created_at,
        type: member.role === 'PRIMARY' ? 'PEMBELIAN PAKET UTAMA' : 'PEMBELIAN ADDON (ANGGOTA TAMBAHAN)',
        status: member.status,
        members: [member]
      });
    }
  });

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '0.5rem' }}>
            Riwayat Transaksi
          </h2>
          <p style={{ color: '#64748b' }}>
            Pantau aktivitas pembelian tiket dan penambahan anggota rombongan Anda.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: '1rem', border: '1px dashed #cbd5e1' }}>
            <p style={{ color: '#94a3b8' }}>Belum ada transaksi yang tercatat.</p>
          </div>
        ) : (
          transactions.map((tx, idx) => {
            const txDate = new Date(tx.date);
            const formattedDate = txDate.toLocaleDateString('id-ID', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit'
            });

            const isSuccess = tx.status === 'ACTIVE';

            return (
              <div key={idx} style={{ 
                backgroundColor: 'white', 
                borderRadius: '1rem', 
                padding: '1.5rem', 
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                borderLeft: `4px solid ${isSuccess ? '#10b981' : '#f59e0b'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        backgroundColor: tx.type.includes('UTAMA') ? '#eff6ff' : '#f3e8ff', 
                        color: tx.type.includes('UTAMA') ? '#3b82f6' : '#9333ea', 
                        borderRadius: '0.25rem', 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold' 
                      }}>
                        {tx.type}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1e293b' }}>
                      {formattedDate}
                    </h3>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span style={{ 
                      padding: '0.5rem 1rem', 
                      backgroundColor: isSuccess ? '#dcfce7' : '#fef3c7', 
                      color: isSuccess ? '#166534' : '#92400e', 
                      borderRadius: '9999px', 
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      {isSuccess ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                          Lunas
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          Menunggu Pembayaran
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Detail Anggota yang Didaftarkan ({tx.members.length} Orang):
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                    {tx.members.map((m: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#334155' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#cbd5e1' }}></div>
                        <span style={{ fontWeight: '500' }}>{m.name}</span>
                        <span style={{ color: '#94a3b8' }}>({m.role})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
