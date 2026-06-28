import React, { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'react-hot-toast';

export default function ProfileTab({ user, onUpdate }: { user: any, onUpdate?: () => void }) {
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    nik: user?.nik || '',
    birth_date: user?.birth_date || '',
    gender: user?.gender || '',
    address: user?.address || '',
    emergency_name: user?.emergency_name || '',
    emergency_phone: user?.emergency_phone || '',
    photo_url: user?.photo_url || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      img.onload = () => {
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
        setFormData(prev => ({ ...prev, photo_url: dataUrl }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          ...formData
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Profil berhasil diperbarui!');
        setIsEditing(false);
        if (onUpdate) onUpdate(); // Refresh parent data if needed
      } else {
        toast.error(data.error || 'Gagal memperbarui profil');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .form-group { display: flex; flexDirection: column; gap: 0.5rem; }
        .form-label { fontSize: 0.875rem; color: #64748b; fontWeight: 500; }
        .form-input { padding: 0.75rem 1rem; borderRadius: 0.5rem; border: 1px solid #cbd5e1; outline: none; transition: all 0.2s; background: #fff; width: 100%; }
        .form-input:focus { borderColor: #059669; boxShadow: 0 0 0 2px rgba(5,150,105,0.1); }
        .form-input:disabled { background: #f8fafc; color: #64748b; cursor: not-allowed; }
      `}} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.5rem' }}>{t('my_profile')}</h2>
          <p style={{ color: '#64748b' }}>Kelola informasi data diri dan avatar Anda di sini.</p>
        </div>
        {isEditing ? (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => setIsEditing(false)}
              disabled={loading}
              style={{ padding: '0.75rem 1.5rem', background: '#f1f5f9', color: '#334155', borderRadius: '0.5rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
            >
              Batal
            </button>
            <button 
              onClick={handleSave}
              disabled={loading}
              style={{ padding: '0.75rem 1.5rem', background: '#059669', color: 'white', borderRadius: '0.5rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsEditing(true)}
            style={{ padding: '0.75rem 1.5rem', background: '#0f172a', color: 'white', borderRadius: '0.5rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
            Edit Profil
          </button>
        )}
      </div>

      {/* Bagian A: Avatar & Identitas */}
      <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', border: '1px solid #e2e8f0', display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            {formData.photo_url ? (
              <img src={formData.photo_url} alt="Avatar" style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #f1f5f9' }} />
            ) : (
              <div style={{ width: '150px', height: '150px', borderRadius: '50%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #f1f5f9', color: 'white', fontSize: '3rem', fontWeight: 'bold' }}>
                <span className="notranslate">{formData.name?.charAt(0)?.toUpperCase() || 'U'}</span>
              </div>
            )}
            
            {isEditing && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                style={{ position: 'absolute', bottom: 0, right: 0, background: '#059669', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </button>
            )}
            <input 
              type="file" 
              accept="image/png, image/jpeg, image/jpg" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              style={{ display: 'none' }} 
            />
          </div>
          {isEditing && <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Maks. 2MB (JPG/PNG)</p>}
        </div>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', alignContent: 'center' }}>
          <div className="form-group">
            <label className="form-label">{t('full_name')}</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} disabled={!isEditing} className="form-input notranslate" translate="no" />
          </div>
          <div className="form-group">
            <label className="form-label">NIK / Nomor ID</label>
            <input type="text" name="nik" value={formData.nik} onChange={handleChange} disabled={!isEditing} className="form-input" placeholder="Masukkan NIK KTP Anda" />
          </div>
        </div>
      </div>

      {/* Bagian B: Kontak & Info Pribadi */}
      <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>Informasi Kontak & Pribadi</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={!isEditing} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">{t('phone')}</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} disabled={!isEditing} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Tanggal Lahir</label>
            <input type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} disabled={!isEditing} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Jenis Kelamin</label>
            <select name="gender" value={formData.gender} onChange={handleChange} disabled={!isEditing} className="form-input">
              <option value="">-- Pilih --</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bagian C: Alamat & Darurat */}
      <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>Alamat & Kontak Darurat</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Alamat Lengkap</label>
            <textarea name="address" value={formData.address} onChange={handleChange} disabled={!isEditing} className="form-input" rows={3} placeholder="Alamat rumah sesuai KTP..."></textarea>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Nama Kontak Darurat</label>
              <input type="text" name="emergency_name" value={formData.emergency_name} onChange={handleChange} disabled={!isEditing} className="form-input" placeholder="Contoh: Istri / Suami / Saudara" />
            </div>
            <div className="form-group">
              <label className="form-label">Nomor Telepon Darurat</label>
              <input type="tel" name="emergency_phone" value={formData.emergency_phone} onChange={handleChange} disabled={!isEditing} className="form-input" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
