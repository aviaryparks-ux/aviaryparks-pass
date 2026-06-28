import React, { useState, useEffect } from 'react';

export default function VisitsTab({ visits, familyMembers = [] }: { visits: any[], familyMembers?: any[] }) {
  
  const [selectedMonth, setSelectedMonth] = useState<string>('Semua Bulan');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

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

  // Expand the first date by default
  useEffect(() => {
    if (sortedDates.length > 0 && Object.keys(expandedDates).length === 0) {
      setExpandedDates({ [sortedDates[0]]: true });
    }
  }, [sortedDates]);

  const toggleExpand = (date: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease-in-out' }}>
      <style>{`
        @keyframes runningDot {
          0% { top: 0%; opacity: 0; }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes pulseSuccess {
          0% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.05); opacity: 1; text-shadow: 0 0 8px rgba(34,197,94,0.4); }
          100% { transform: scale(1); opacity: 0.9; }
        }
      `}</style>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        
        {/* Total Visits Stat */}
        <div style={{ flex: '1', background: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '1rem', color: '#16a34a' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
          </div>
          <div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Total Petualangan Keluarga</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>{totalVisits} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#64748b' }}>Hari</span></p>
          </div>
        </div>

        {/* Favorite Month Stat */}
        <div style={{ flex: '1', background: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: '#fffbeb', padding: '1rem', borderRadius: '1rem', color: '#d97706' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
          </div>
          <div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Bulan Paling Aktif</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>{totalVisits > 0 ? favoriteMonth : '-'}</p>
          </div>
        </div>
        
      </div>

      {/* TIMELINE SECTION */}
      <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.5rem' }}>Jejak Petualangan</h2>
            <p style={{ color: '#64748b' }}>Log anggota keluarga yang masuk ke gerbang Aviary Park.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Filter Bulan:</span>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', outline: 'none', background: 'white', color: '#0f172a', fontWeight: '500', cursor: 'pointer' }}
            >
              {monthOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {visits.length === 0 ? (
          /* EMPTY STATE */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', textAlign: 'center' }}>
            <div style={{ width: '120px', height: '120px', background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', border: '4px dashed #cbd5e1' }}>
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#334155', marginBottom: '0.5rem' }}>Jejak Masih Bersih!</h3>
            <p style={{ color: '#64748b', maxWidth: '400px', marginBottom: '1.5rem' }}>Keluarga Anda belum pernah melakukan pemindaian tiket di gerbang Aviary Park. Ayo mulai petualangan akhir pekan ini!</p>
            <button style={{ padding: '0.75rem 1.5rem', background: '#059669', color: 'white', borderRadius: '0.5rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>Lihat Jadwal Pertunjukan</button>
          </div>
        ) : (
          /* TIMELINE LIST */
          <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
            {/* Vertical Line connecting timeline dots */}
            <div style={{ position: 'absolute', left: '2rem', top: '2rem', bottom: '2rem', width: '2px', background: '#e2e8f0' }}>
              {/* Running Dot Animation */}
              <div style={{
                position: 'absolute',
                left: '-4px', /* center 10px dot on 2px line */
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 10px #10b981',
                animation: 'runningDot 3.5s infinite ease-in-out'
              }}></div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {sortedDates.map((dateStr, index) => {
                const dayVisits = groupedVisits[dateStr];
                const isLatest = index === 0;

                return (
                  <div key={index} style={{ display: 'flex', gap: '1.5rem', position: 'relative' }}>
                    {/* Dot Indicator */}
                    <div style={{ position: 'relative', zIndex: 1, marginTop: '0.25rem', display: 'flex', justifyContent: 'center' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: isLatest ? '#10b981' : '#cbd5e1', border: '4px solid white', boxShadow: '0 0 0 1px #e2e8f0' }}></div>
                    </div>

                    {/* Content Card */}
                    <div style={{ flex: 1, background: isLatest ? '#f0fdf4' : '#f8fafc', border: isLatest ? '1px solid #bbf7d0' : '1px solid #f1f5f9', borderRadius: '1rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      
                      {/* Card Header - Clickable for Accordion */}
                      <div 
                        onClick={() => toggleExpand(dateStr)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontWeight: 'bold', color: isLatest ? '#065f46' : '#334155', fontSize: '1.1rem' }}>
                            {dateStr}
                          </span>
                          {isLatest && (
                            <span style={{ fontSize: '0.65rem', background: '#10b981', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Terbaru</span>
                          )}
                          <span style={{ fontSize: '0.875rem', color: '#64748b', background: '#e2e8f0', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontWeight: '500' }}>
                            {dayVisits.length} Masuk
                          </span>
                        </div>
                        <div style={{ color: '#64748b', transition: 'transform 0.3s', transform: expandedDates[dateStr] ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                        </div>
                      </div>
                      
                      {/* Card Body - Collapsible */}
                      {expandedDates[dateStr] && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0 1.5rem 1.5rem 1.5rem' }}>
                          {dayVisits.map((v, vIndex) => {
                            const member = familyMembers.find(m => m.id === v.member_id);
                            const memberName = member ? member.name.split(' ')[0] : 'Anggota';
                            const time = new Date(v.visited_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                            const gateName = v.gate_name || 'Gerbang Utama';

                            return (
                              <div key={vIndex} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#64748b', overflow: 'hidden' }}>
                                    {member?.photo_url ? (
                                      <img src={member.photo_url} alt={memberName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      memberName.charAt(0)
                                    )}
                                  </div>
                                  <div>
                                    <p className="notranslate" translate="no" style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.95rem' }}>{memberName}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#64748b', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                        {time} WIB
                                      </span>
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                        {gateName}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#22c55e', fontSize: '0.75rem', fontWeight: 'bold', animation: 'pulseSuccess 2s infinite' }}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'bounceSuccess 2s infinite' }}><polyline points="20 6 9 17 4 12"/></svg>
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
      </div>

    </div>
  );
}
