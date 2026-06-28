import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';

function MemberCard({ member, visits }: { member: any; visits: any[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(member.photo_url);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran gambar maksimal 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // Save to DB immediately
        setLoading(true);
        try {
          const res = await fetch('/api/profile/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: member.id,
              photo_url: dataUrl
            })
          });

          const data = await res.json();
          if (data.success) {
            setPhotoUrl(dataUrl);
            toast.success(`Avatar ${member.name.split(' ')[0]} berhasil diperbarui!`);
          } else {
            toast.error(data.error || 'Gagal memperbarui avatar');
          }
        } catch (error) {
          toast.error('Terjadi kesalahan koneksi');
        } finally {
          setLoading(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '1rem',
      padding: '1.5rem',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top color bar depending on role */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        backgroundColor: member.role === 'PRIMARY' ? '#3b82f6' : member.role === 'ISTRI' || member.role === 'SUAMI' ? '#ec4899' : '#eab308'
      }}></div>

      {/* Avatar Container with Upload Hover */}
      <div 
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
          color: '#94a3b8',
          fontSize: '2rem',
          fontWeight: 'bold',
          border: '2px solid #e2e8f0',
          position: 'relative',
          cursor: loading ? 'wait' : 'pointer',
          overflow: 'hidden',
          backgroundImage: photoUrl ? `url(${photoUrl})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        onClick={() => !loading && fileInputRef.current?.click()}
        title="Klik untuk ubah avatar"
      >
        {!photoUrl && (
          <span className="notranslate" translate="no">
            {member.name.substring(0, 2).toUpperCase()}
          </span>
        )}

        {/* Hover overlay */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0,
          transition: 'opacity 0.2s',
          color: 'white'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
        >
          {loading ? (
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          )}
        </div>
        
        <input 
          type="file" 
          accept="image/png, image/jpeg, image/jpg" 
          ref={fileInputRef} 
          onChange={handleImageChange} 
          style={{ display: 'none' }} 
        />
      </div>

      <h3 className="notranslate" translate="no" style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '0.25rem', textAlign: 'center' }}>
        {member.name}
      </h3>
      <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.25rem' }}>NIK: {member.nik || '-'}</p>
      <p style={{ color: '#16a34a', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        Total Kunjungan: {visits.filter(v => v.member_id === member.id).length} Kali
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={{
          padding: '0.25rem 0.75rem',
          backgroundColor: member.role === 'PRIMARY' ? '#eff6ff' : member.role === 'ISTRI' || member.role === 'SUAMI' ? '#fdf2f8' : '#fefce8',
          color: member.role === 'PRIMARY' ? '#2563eb' : member.role === 'ISTRI' || member.role === 'SUAMI' ? '#db2777' : '#ca8a04',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: '600'
        }}>
          {member.role}
        </span>
        <span style={{
          padding: '0.25rem 0.75rem',
          backgroundColor: member.status === 'ACTIVE' ? (member.face_descriptor ? '#dcfce7' : '#fee2e2') : '#fef3c7',
          color: member.status === 'ACTIVE' ? (member.face_descriptor ? '#166534' : '#991b1b') : '#92400e',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: '600'
        }}>
          {member.status === 'ACTIVE' 
            ? (member.face_descriptor ? 'Wajah Aktif' : 'Belum Rekam Wajah') 
            : 'Menunggu Pembayaran'}
        </span>
        
        {/* Jika lunas tapi belum rekam wajah, berikan tombol untuk rekam */}
        {member.status === 'ACTIVE' && !member.face_descriptor && (
          <button 
            onClick={() => window.location.href = '/face-setup'}
            style={{ 
              marginTop: '0.5rem',
              width: '100%',
              padding: '0.35rem 0', 
              backgroundColor: '#ef4444', 
              color: 'white', 
              border: 'none', 
              borderRadius: '0.25rem', 
              fontSize: '0.75rem', 
              fontWeight: 'bold', 
              cursor: 'pointer' 
            }}
          >
            📸 Rekam Wajah Sekarang
          </button>
        )}
      </div>
    </div>
  );
}

export default function AnggotaKeluargaTab({ familyMembers, visits = [] }: { familyMembers: any[], visits?: any[] }) {
  // Urutkan agar PRIMARY selalu muncul di paling awal
  const sortedMembers = [...familyMembers].sort((a, b) => {
    if (a.role === 'PRIMARY') return -1;
    if (b.role === 'PRIMARY') return 1;
    return 0;
  });

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out', paddingBottom: '3rem' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#0f172a' }}>Anggota Keluarga</h2>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
        Kelola anggota keluarga yang tergabung dalam rombongan Anda. Klik foto profil untuk mengubah avatar anggota keluarga.
      </p>

      {familyMembers.filter(m => m.status === 'PENDING_PAYMENT').length > 0 && (
        <div style={{ padding: '1rem', backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#b45309', marginBottom: '0.25rem' }}>Pembayaran Tertunda</h3>
            <p style={{ fontSize: '0.875rem', color: '#92400e', margin: 0 }}>
              Anda memiliki <strong>{familyMembers.filter(m => m.status === 'PENDING_PAYMENT').length}</strong> anggota yang berstatus <i>Menunggu Pembayaran</i>.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              onClick={async () => {
                if (!confirm('Apakah Anda yakin ingin membatalkan penambahan anggota ini? Data yang belum dibayar akan dihapus.')) return;
                try {
                  // Get groupId from the first pending member
                  const groupId = familyMembers.find(m => m.status === 'PENDING_PAYMENT')?.group_id;
                  if (!groupId) return;
                  
                  const res = await fetch('/api/members/cancel-pending', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ groupId })
                  });
                  if (res.ok) {
                    window.location.reload();
                  } else {
                    toast.error('Gagal membatalkan transaksi.');
                  }
                } catch (e) {
                  console.error(e);
                  toast.error('Terjadi kesalahan.');
                }
              }}
              style={{ padding: '0.5rem 1rem', backgroundColor: 'transparent', color: '#b45309', fontWeight: 'bold', borderRadius: '0.5rem', border: '1px solid #fcd34d', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Batalkan
            </button>
            <button 
              onClick={() => window.location.href = '/payment'}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#f59e0b', color: 'white', fontWeight: 'bold', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Selesaikan Pembayaran
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {sortedMembers.map((member) => (
          <MemberCard key={member.id} member={member} visits={visits} />
        ))}

        {/* Add Member Button */}
        <div style={{
          background: 'transparent',
          borderRadius: '1rem',
          padding: '1.5rem',
          border: '2px dashed #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '220px',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#94a3b8';
          e.currentTarget.style.backgroundColor = 'rgba(241, 245, 249, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#cbd5e1';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        onClick={() => window.location.href = '/add-member'}
        >
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            backgroundColor: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </div>
          <span style={{ color: '#475569', fontWeight: '500' }}>Tambah Anggota</span>
          <span style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.25rem', textAlign: 'center' }}>Daftarkan anggota baru</span>
        </div>
      </div>
    </div>
  );
}
