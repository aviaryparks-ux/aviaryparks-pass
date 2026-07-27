const fs = require('fs');
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');
const insert = `          )}

          {/* Redemption History */}
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '2rem' }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>Riwayat Penukaran Poin</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: '0.875rem' }}>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>Waktu</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>Member</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>Reward</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>Poin Terpakai</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>Status Kupon</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Belum ada data penukaran poin.</td>
                  </tr>
                ) : redemptions.map((red, idx) => (
                  <tr key={red.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem 1.5rem', color: '#64748b', fontSize: '0.9rem' }}>
                      {new Date(red.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: '#0f172a' }}>
                      {red.members?.name}<br/>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{red.members?.email}</span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#0f172a' }}>
                      {red.rewards_catalog?.name}<br/>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{red.rewards_catalog?.reward_type}</span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#ef4444', fontWeight: '600' }}>
                      -{red.rewards_catalog?.points_required} Poin
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold',
                        backgroundColor: red.status === 'ACTIVE' ? '#dcfce7' : red.status === 'USED' ? '#f1f5f9' : '#fee2e2',
                        color: red.status === 'ACTIVE' ? '#166534' : red.status === 'USED' ? '#475569' : '#991b1b'
                      }}>
                        {red.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>`;
code = code.replace(/          \)}\r?\n        <\/div>/g, insert);
fs.writeFileSync('src/app/admin/page.tsx', code);
