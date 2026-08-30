import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
// Icons
const PencilIcon = (props: any) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>;
const TrashIcon = (props: any) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const PlusIcon = (props: any) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const XMarkIcon = (props: any) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;

export default function MasterWahanaTab() {
  const [wahanas, setWahanas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    topup_price: 0,
    is_active: true
  });

  const fetchWahanas = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/wahanas');
      if (!res.ok) throw new Error('Gagal mengambil data wahana');
      const data = await res.json();
      setWahanas(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWahanas();
  }, []);

  const handleOpenModal = (wahana?: any) => {
    if (wahana) {
      setEditingId(wahana.id);
      setFormData({
        name: wahana.name,
        description: wahana.description || '',
        topup_price: wahana.topup_price,
        is_active: wahana.is_active
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        topup_price: 0,
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { ...formData, id: editingId } : formData;

      const res = await fetch('/api/admin/wahanas', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Gagal menyimpan data');
      }

      toast.success(editingId ? 'Wahana berhasil diperbarui' : 'Wahana baru berhasil ditambahkan');
      fetchWahanas();
      handleCloseModal();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Yakin ingin menghapus wahana "${name}"? Data yang sudah dihapus tidak bisa dikembalikan.`)) return;

    try {
      const res = await fetch(`/api/admin/wahanas?id=${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Gagal menghapus wahana');
      }

      toast.success('Wahana berhasil dihapus');
      fetchWahanas();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '0.5rem' }}>
            Master Data Wahana
          </h2>
          <p style={{ color: '#64748b' }}>
            Kelola daftar wahana beserta harga top-up tiket untuk masing-masing wahana.
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.5rem', 
            backgroundColor: '#10b981', 
            color: 'white', 
            border: 'none', 
            borderRadius: '0.5rem', 
            cursor: 'pointer',
            fontWeight: '600',
            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)',
            transition: 'all 0.2s'
          }}
        >
          <PlusIcon style={{ width: '20px', height: '20px' }} />
          Tambah Wahana
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Memuat data wahana...</div>
        ) : wahanas.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Belum ada data wahana yang ditambahkan.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Nama Wahana</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Deskripsi</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Harga Top-Up (Rp)</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {wahanas.map((w) => (
                <tr key={w.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem 1.5rem', color: '#1e293b', fontWeight: '500' }}>{w.name}</td>
                  <td style={{ padding: '1rem 1.5rem', color: '#64748b', fontSize: '0.9rem' }}>{w.description || '-'}</td>
                  <td style={{ padding: '1rem 1.5rem', color: '#1e293b', textAlign: 'right', fontWeight: '500' }}>
                    {w.topup_price.toLocaleString('id-ID')}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '1rem', 
                      fontSize: '0.75rem', 
                      fontWeight: '600',
                      backgroundColor: w.is_active ? '#dcfce7' : '#f1f5f9',
                      color: w.is_active ? '#166534' : '#64748b'
                    }}>
                      {w.is_active ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button 
                        onClick={() => handleOpenModal(w)}
                        style={{ padding: '0.5rem', backgroundColor: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                        title="Edit"
                      >
                        <PencilIcon style={{ width: '16px', height: '16px' }} />
                      </button>
                      <button 
                        onClick={() => handleDelete(w.id, w.name)}
                        style={{ padding: '0.5rem', backgroundColor: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                        title="Hapus"
                      >
                        <TrashIcon style={{ width: '16px', height: '16px' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'fadeIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>
                {editingId ? 'Edit Wahana' : 'Tambah Wahana Baru'}
              </h3>
              <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <XMarkIcon style={{ width: '24px', height: '24px' }} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: '#334155', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                  Nama Wahana *
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', color: '#1e293b', outline: 'none' }}
                  placeholder="Cth: Mini Train"
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: '#334155', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                  Deskripsi Singkat
                </label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', color: '#1e293b', outline: 'none', minHeight: '80px', resize: 'vertical' }}
                  placeholder="Cth: Wahana berkeliling taman"
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: '#334155', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                  Harga Top-Up (Per 1 Tiket) *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ color: '#64748b', fontWeight: '600' }}>Rp</span>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={formData.topup_price}
                    onChange={(e) => setFormData({...formData, topup_price: parseInt(e.target.value) || 0})}
                    style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', color: '#1e293b', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ color: '#334155', fontWeight: '500' }}>Wahana Aktif (Tersedia)</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  style={{ padding: '0.75rem 1.5rem', backgroundColor: 'white', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  style={{ padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}
                >
                  {editingId ? 'Simpan Perubahan' : 'Tambah Wahana'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
