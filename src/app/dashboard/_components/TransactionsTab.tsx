import React, { useEffect, useState } from 'react';

export default function TransactionsTab({ familyMembers, user }: { familyMembers: any[]; user?: any }) {
  const [historyData, setHistoryData] = useState<{
    transactions: any[];
    posTransactions: any[];
    voucherLogs: any[];
    vouchers: any[];
  }>({
    transactions: [],
    posTransactions: [],
    voucherLogs: [],
    vouchers: []
  });
  const [loading, setLoading] = useState(true);

  const primaryUser = user || familyMembers.find(m => m.role === 'PRIMARY') || familyMembers[0];

  useEffect(() => {
    if (!primaryUser?.id) return;
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/visitor/vouchers?member_id=${primaryUser.id}&type=history`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setHistoryData(json.data);
          }
        }
      } catch (err) {
        console.error('Failed to load transaction history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [primaryUser]);

  // Gabungkan transaksi dari Database Transactions dan fallback grup anggota
  const mergedTransactions: any[] = [];

  // 1. Transaksi Database (Membership Online, Wahana Satuan, Bundling)
  if (historyData.transactions.length > 0) {
    historyData.transactions.forEach(t => {
      const isPaid = ['PAID', 'SUCCESS', 'COMPLETED'].includes(t.payment_status || t.status);
      mergedTransactions.push({
        id: t.merchant_order_id || t.id,
        date: t.created_at,
        title: t.package_name || 'Pembelian Paket',
        amount: Number(t.amount || t.total_amount || 0),
        status: isPaid ? 'SUCCESS' : (t.status || 'PENDING'),
        method: t.payment_method || 'Online Payment',
        members: familyMembers,
        type: t.merchant_order_id?.startsWith('WAHANA-') ? 'TIKET WAHANA' : (t.merchant_order_id?.startsWith('BUNDLE-') ? 'PAKET BUNDLING' : 'MEMBERSHIP ANNUAL PASS')
      });
    });
  }

  // 2. Transaksi POS Kasir (Top-Up / Bundling di Loket)
  if (historyData.posTransactions.length > 0) {
    historyData.posTransactions.forEach(p => {
      if (Number(p.amount || 0) > 0) {
        mergedTransactions.push({
          id: p.invoice_number || p.id,
          date: p.created_at,
          title: p.location === 'PAKET BUNDLING' ? 'Paket Bundling Wahana' : (p.location || 'Tiket Wahana POS'),
          amount: Number(p.amount || 0),
          status: 'SUCCESS',
          method: p.payment_method || 'QRIS',
          members: familyMembers,
          type: 'KASIR POS WAHANA'
        });
      }
    });
  }

  // 3. Fallback jika tabel transaksi kosong tapi ada member terdaftar
  if (mergedTransactions.length === 0 && familyMembers.length > 0) {
    mergedTransactions.push({
      id: primaryUser?.id,
      date: primaryUser?.activation_date || primaryUser?.created_at,
      title: 'Pembelian Paket Utama Annual Pass',
      amount: 450000,
      status: primaryUser?.status === 'ACTIVE' ? 'SUCCESS' : 'PENDING',
      method: 'Online Payment',
      members: familyMembers,
      type: 'MEMBERSHIP ANNUAL PASS'
    });
  }

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Urutkan transaksi dari yang paling baru
  mergedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPages = Math.ceil(mergedTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = mergedTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '0.5rem' }}>
            Riwayat Transaksi
          </h2>
          <p style={{ color: '#64748b' }}>
            Pantau aktivitas pembelian tiket, membership, dan paket wahana Anda ({mergedTransactions.length} transaksi).
          </p>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.35rem 0.75rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
              Hal {currentPage} dari {totalPages}
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: '1rem' }}>
            <p style={{ color: '#94a3b8' }}>Memuat riwayat transaksi...</p>
          </div>
        ) : paginatedTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: '1rem', border: '1px dashed #cbd5e1' }}>
            <p style={{ color: '#94a3b8' }}>Belum ada transaksi yang tercatat.</p>
          </div>
        ) : (
          paginatedTransactions.map((tx, idx) => {
            const txDate = new Date(tx.date);
            const formattedDate = txDate.toLocaleDateString('id-ID', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit'
            });

            const isSuccess = tx.status === 'SUCCESS' || tx.status === 'ACTIVE';

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
                        backgroundColor: tx.type.includes('ANNUAL') ? '#eff6ff' : (tx.type.includes('BUNDLING') ? '#fef3c7' : '#f3e8ff'), 
                        color: tx.type.includes('ANNUAL') ? '#3b82f6' : (tx.type.includes('BUNDLING') ? '#d97706' : '#9333ea'), 
                        borderRadius: '0.25rem', 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold' 
                      }}>
                        {tx.type}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1e293b' }}>
                      {tx.title}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                      {formattedDate} • Order: <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{tx.id}</span>
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#059669' }}>
                      Rp {tx.amount.toLocaleString('id-ID')}
                    </div>
                    <span style={{ 
                      padding: '0.4rem 0.85rem', 
                      backgroundColor: isSuccess ? '#dcfce7' : '#fef3c7', 
                      color: isSuccess ? '#166534' : '#92400e', 
                      borderRadius: '9999px', 
                      fontWeight: 'bold',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}>
                      {isSuccess ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                          Lunas ({tx.method})
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          Menunggu Pembayaran
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid #cbd5e1',
                background: currentPage === 1 ? '#f8fafc' : 'white',
                color: currentPage === 1 ? '#94a3b8' : '#334155',
                fontWeight: '600',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              ← Sebelumnya
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '0.5rem',
                  border: pageNum === currentPage ? '2px solid #059669' : '1px solid #cbd5e1',
                  background: pageNum === currentPage ? '#ecfdf5' : 'white',
                  color: pageNum === currentPage ? '#059669' : '#334155',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid #cbd5e1',
                background: currentPage === totalPages ? '#f8fafc' : 'white',
                color: currentPage === totalPages ? '#94a3b8' : '#334155',
                fontWeight: '600',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Selanjutnya →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
