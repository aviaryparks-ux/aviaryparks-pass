import React, { useState, useEffect } from 'react';

export default function VisitsTab({ visits, familyMembers = [] }: { visits: any[], familyMembers?: any[] }) {
  
  const [selectedMonth, setSelectedMonth] = useState<string>('Semua Bulan');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5; // Tampilkan 5 tanggal per halaman agar tidak memanjang terus ke bawah

  // Calculate Family Visits (unique days)
  // Use local timezone (en-CA gives YYYY-MM-DD format in local time)
  const uniqueVisitDays = new Set(visits.map(v => new Date(v.visited_at).toLocaleDateString('en-CA')));
  const totalVisits = uniqueVisitDays.size;
  
  // Find favorite month based on unique days
  const monthCounts: Record<string, number> = {};
  let favoriteMonth = '-';
  let maxCount = 0;
  
  const availableMonths = new Set<string>();

  Array.from(uniqueVisitDays).forEach(dateStr => {
    const d = new Date(dateStr as string);
    const mYear = d.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    availableMonths.add(mYear);

    const m = d.toLocaleString('id-ID', { month: 'long' });
    monthCounts[m] = (monthCounts[m] || 0) + 1;
    if (monthCounts[m] > maxCount) {
      maxCount = monthCounts[m];
      favoriteMonth = m;
    }
  });

  const monthOptions = ['Semua Bulan', ...Array.from(availableMonths).sort((a, b) => {
    return new Date('1 ' + b).getTime() - new Date('1 ' + a).getTime();
  })];

  // Group visits by date for the timeline
  const groupedVisits: Record<string, any[]> = {};
  visits.forEach(v => {
    const d = new Date(v.visited_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const mYear = new Date(v.visited_at).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    
    if (selectedMonth === 'Semua Bulan' || selectedMonth === mYear) {
      if (!groupedVisits[d]) groupedVisits[d] = [];
      groupedVisits[d].push(v);
    }
  });

  // Sort dates descending
  const sortedDates = Object.keys(groupedVisits).sort((a, b) => {
    return new Date(groupedVisits[b][0].visited_at).getTime() - new Date(groupedVisits[a][0].visited_at).getTime();
  });

  // Pagination calculation
  const totalPages = Math.ceil(sortedDates.length / itemsPerPage);
  const paginatedDates = sortedDates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Expand the first date of current page by default
  useEffect(() => {
    if (paginatedDates.length > 0) {
      setExpandedDates(prev => ({ ...prev, [paginatedDates[0]]: true }));
    }
  }, [currentPage, selectedMonth]);

  // Reset page when month filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth]);

  const toggleExpand = (date: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'fadeIn 0.3s ease-in-out' }}>
      <style>{`
        @keyframes runningDot {
          0% { top: 0%; opacity: 0; }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes pulseSuccess {
          0% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 0.9; }
        }
        .visits-stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
        }
        .visits-card-container {
          background: white;
          border-radius: 1.25rem;
          padding: 1.5rem;
          border: 1px solid #e2e8f0;
        }
        .timeline-wrapper {
          position: relative;
          padding-left: 1.5rem;
        }
        .timeline-line {
          position: absolute;
          left: 0.75rem;
          top: 1rem;
          bottom: 1rem;
          width: 2px;
          background: #e2e8f0;
        }
        .timeline-dot {
          position: absolute;
          left: -4px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
          animation: runningDot 3.5s infinite ease-in-out;
        }
        .timeline-item-dot {
          position: absolute;
          left: 0.25rem;
          top: 1.25rem;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 0 0 1px #cbd5e1;
          z-index: 2;
        }
        @media (max-width: 640px) {
          .visits-card-container {
            padding: 1.25rem 1rem !important;
            border-radius: 1rem !important;
          }
          .timeline-wrapper {
            padding-left: 1rem !important;
          }
          .timeline-line {
            left: 0.35rem !important;
          }
          .timeline-item-dot {
            left: 0 !important;
            width: 12px !important;
            height: 12px !important;
          }
        }
      `}</style>
      
      {/* STATS SECTION */}
      <div className="visits-stat-grid">
        
        {/* Total Visits Stat */}
        <div style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '48px', height: '48px', background: '#f0fdf4', borderRadius: '0.75rem', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', margin: 0 }}>Total Kunjungan Keluarga</p>
            <p style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', margin: '0.2rem 0 0 0' }}>{totalVisits} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Hari</span></p>
          </div>
        </div>

        {/* Favorite Month Stat */}
        <div style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '48px', height: '48px', background: '#fffbeb', borderRadius: '0.75rem', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', margin: 0 }}>Bulan Paling Aktif</p>
            <p style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: '0.2rem 0 0 0' }}>{totalVisits > 0 ? favoriteMonth : '-'}</p>
          </div>
        </div>
        
      </div>

      {/* TIMELINE SECTION */}
      <div className="visits-card-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Jejak Petualangan</h2>
            <p style={{ color: '#64748b', fontSize: '0.825rem', margin: '0.25rem 0 0 0' }}>Log kunjungan anggota keluarga di gerbang Aviary Park.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: '200px' }}>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', outline: 'none', background: 'white', color: '#0f172a', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              {monthOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {visits.length === 0 ? (
          /* EMPTY STATE */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1rem', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', border: '3px dashed #cbd5e1' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#334155', marginBottom: '0.25rem' }}>Jejak Masih Bersih!</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: '360px', margin: '0 0 1.25rem 0' }}>Keluarga Anda belum pernah memindai tiket di gerbang Aviary Park. Ayo mulai petualangan akhir pekan ini!</p>
          </div>
        ) : (
          /* TIMELINE LIST */
          <div className="timeline-wrapper">
            {/* Vertical Line */}
            <div className="timeline-line">
              <div className="timeline-dot"></div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {paginatedDates.map((dateStr, index) => {
                const dayVisits = groupedVisits[dateStr];
                const isLatest = index === 0 && currentPage === 1;

                return (
                  <div key={index} style={{ position: 'relative', paddingLeft: '1rem' }}>
                    {/* Dot Indicator */}
                    <div className="timeline-item-dot" style={{ background: isLatest ? '#10b981' : '#cbd5e1' }}></div>

                    {/* Content Card */}
                    <div style={{ background: isLatest ? '#f0fdf4' : '#f8fafc', border: isLatest ? '1px solid #bbf7d0' : '1px solid #e2e8f0', borderRadius: '0.875rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      
                      {/* Card Header - Clickable for Accordion */}
                      <div 
                        onClick={() => toggleExpand(dateStr)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', cursor: 'pointer', userSelect: 'none', gap: '0.5rem' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: '700', color: isLatest ? '#065f46' : '#1e293b', fontSize: '0.95rem' }}>
                            {dateStr}
                          </span>
                          {isLatest && (
                            <span style={{ fontSize: '0.65rem', background: '#10b981', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontWeight: '800', letterSpacing: '0.05em' }}>TERBARU</span>
                          )}
                          <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#e2e8f0', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontWeight: '600' }}>
                            {dayVisits.length} Masuk
                          </span>
                        </div>
                        <div style={{ color: '#64748b', transition: 'transform 0.3s', transform: expandedDates[dateStr] ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                        </div>
                      </div>
                      
                      {/* Card Body - Collapsible */}
                      {expandedDates[dateStr] && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0 0.875rem 0.875rem 0.875rem' }}>
                          {dayVisits.map((v, vIndex) => {
                            const member = familyMembers.find(m => m.id === v.member_id);
                            const memberName = member ? member.name.split(' ')[0] : 'Anggota';
                            const time = new Date(v.visited_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                            const gateName = v.gate_name || 'Gerbang Utama';

                            return (
                              <div key={vIndex} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#64748b', overflow: 'hidden', flexShrink: 0 }}>
                                    {member?.photo_url ? (
                                      <img src={member.photo_url} alt={memberName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      memberName.charAt(0)
                                    )}
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <p className="notranslate" translate="no" style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.875rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{memberName}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                                      <span>{time} WIB</span>
                                      <span>•</span>
                                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{gateName}</span>
                                    </div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#16a34a', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                  Akses Valid
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pagination Controls Outside Timeline Wrapper */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9', flexWrap: 'nowrap' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.5rem 0.875rem',
                borderRadius: '2rem',
                border: '1px solid #cbd5e1',
                background: currentPage === 1 ? '#f8fafc' : 'white',
                color: currentPage === 1 ? '#94a3b8' : '#0f172a',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: currentPage === 1 ? 'none' : '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              ← Prev
            </button>

            <div style={{ background: '#f1f5f9', padding: '0.35rem 0.875rem', borderRadius: '1rem', fontSize: '0.75rem', color: '#475569', fontWeight: '700', whiteSpace: 'nowrap' }}>
              {currentPage} / {totalPages}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.5rem 0.875rem',
                borderRadius: '2rem',
                border: '1px solid #cbd5e1',
                background: currentPage === totalPages ? '#f8fafc' : 'white',
                color: currentPage === totalPages ? '#94a3b8' : '#0f172a',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: currentPage === totalPages ? 'none' : '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
