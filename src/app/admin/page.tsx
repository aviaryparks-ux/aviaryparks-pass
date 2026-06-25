"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [visitsData, setVisitsData] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING_PAYMENT'>('ALL');
  
  // Package Management State
  const [packages, setPackages] = useState<any[]>([]);
  const [newPkg, setNewPkg] = useState({ name: '', min_qty: 1, max_qty: 1, price: '' });

  const [loading, setLoading] = useState(true);

  // System Users State
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'SYSTEM_USERS' | 'TICKET_PACKAGES'>('DASHBOARD');
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [newSysUser, setNewSysUser] = useState({ username: '', password: '', role: 'GATE' });

  useEffect(() => {
    fetchData();

    // Setup Realtime subscriptions
    const membersChannel = supabase.channel('public:members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, fetchData)
      .subscribe();
      
    const visitsChannel = supabase.channel('public:visits')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, fetchData)
      .subscribe();
      
    const pkgsChannel = supabase.channel('public:ticket_packages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_packages' }, fetchPackages)
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(visitsChannel);
      supabase.removeChannel(pkgsChannel);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'SYSTEM_USERS') {
      fetchSystemUsers();
    }
  }, [activeTab]);

  async function fetchSystemUsers() {
    const { data, error } = await supabase.from('system_users').select('*').order('created_at', { ascending: false });
    if (data && !error) setSystemUsers(data);
  }

  const addSystemUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSysUser.username || !newSysUser.password) return;
    
    const { error } = await supabase.from('system_users').insert([{
      username: newSysUser.username,
      password: newSysUser.password,
      role: newSysUser.role
    }]);

    if (error) {
      alert('Gagal menambah user: ' + error.message);
    } else {
      setNewSysUser({ username: '', password: '', role: 'GATE' });
      alert('User berhasil ditambahkan!');
      fetchSystemUsers();
    }
  };

  const deleteSystemUser = async (id: string) => {
    if (!confirm('Yakin ingin menghapus user ini?')) return;
    const { error } = await supabase.from('system_users').delete().eq('id', id);
    if (!error) fetchSystemUsers();
    else alert('Gagal menghapus user: ' + error.message);
  };

  async function fetchPackages() {
    const { data } = await supabase.from('ticket_packages').select('*').order('min_qty', { ascending: true });
    if (data) setPackages(data);
  }

  async function fetchData() {
    // 1. Fetch Users
    const { data: membersData } = await supabase.from('members').select('*').order('created_at', { ascending: false });
    if (membersData) setUsers(membersData);

    // 2. Fetch Packages
    await fetchPackages();

    // 3. Fetch Visits & Aggregate for Chart
    const { data: vData } = await supabase.from('visits').select('visited_at');
    if (vData) {
      const visitCounts: Record<string, number> = {};
      vData.forEach(v => {
        const date = new Date(v.visited_at).toLocaleDateString('id-ID');
        visitCounts[date] = (visitCounts[date] || 0) + 1;
      });
      const chartVData = Object.keys(visitCounts).map(date => ({ date, Kunjungan: visitCounts[date] }));
      setVisitsData(chartVData);
    }

    // 4. Aggregate Sales Data
    if (membersData) {
      const salesCounts: Record<string, { Lunas: number; BelumLunas: number }> = {};
      membersData.forEach(m => {
        const date = new Date(m.created_at).toLocaleDateString('id-ID');
        if (!salesCounts[date]) salesCounts[date] = { Lunas: 0, BelumLunas: 0 };
        
        if (m.status === 'ACTIVE') {
          salesCounts[date].Lunas += 1;
        } else {
          salesCounts[date].BelumLunas += 1;
        }
      });
      const chartSData = Object.keys(salesCounts).map(date => ({ 
        date, 
        Lunas: salesCounts[date].Lunas,
        BelumLunas: salesCounts[date].BelumLunas
      }));
      setSalesData(chartSData);
    }

    setLoading(false);
  }

  const addPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPkg.name || !newPkg.price) return;
    
    const { error } = await supabase.from('ticket_packages').insert([{
      name: newPkg.name,
      min_qty: Number(newPkg.min_qty),
      max_qty: Number(newPkg.max_qty),
      price: Number(newPkg.price),
      is_active: true
    }]);

    if (error) {
      alert('Gagal menambah paket: ' + error.message);
    } else {
      setNewPkg({ name: '', min_qty: 1, max_qty: 1, price: '' });
      alert('Paket berhasil ditambahkan!');
      fetchPackages();
    }
  };

  const deletePackage = async (id: string) => {
    if (!confirm('Hapus paket ini?')) return;
    const { error } = await supabase.from('ticket_packages').delete().eq('id', id);
    if (!error) fetchPackages();
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Yakin ingin menghapus pelanggan ini?')) return;
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) {
      alert('Gagal menghapus pelanggan: ' + error.message);
    } else {
      setUsers(prev => prev.filter(u => u.id !== id));
      fetchData();
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      
      {/* SIDEBAR */}
      <aside style={{ width: '260px', backgroundColor: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '35px' }} />
          <div style={{ fontWeight: 'bold', color: '#059669', fontSize: '1.1rem', lineHeight: 1.1 }}>
            Aviary Park<br/><span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 'normal' }}>Indonesia</span>
          </div>
        </div>
        
        <div style={{ padding: '1.5rem 1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
          
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#94a3b8', marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>Dashboard</p>
            <div 
              onClick={() => setActiveTab('DASHBOARD')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', backgroundColor: activeTab === 'DASHBOARD' ? '#ecfdf5' : 'transparent', color: activeTab === 'DASHBOARD' ? '#059669' : '#475569', borderRadius: '0.5rem', fontWeight: activeTab === 'DASHBOARD' ? 'bold' : 'normal', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Dashboard
            </div>
          </div>

          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#94a3b8', marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>MANAJEMEN TIKET</p>
            <div 
              onClick={() => setActiveTab('TICKET_PACKAGES')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', backgroundColor: activeTab === 'TICKET_PACKAGES' ? '#ecfdf5' : 'transparent', color: activeTab === 'TICKET_PACKAGES' ? '#059669' : '#475569', borderRadius: '0.5rem', fontWeight: activeTab === 'TICKET_PACKAGES' ? 'bold' : 'normal', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
              Paket Tiket
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', color: '#475569', fontSize: '0.9rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
              Transaksi
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', color: '#475569', fontSize: '0.9rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
              Check-in
            </div>
          </div>

          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#94a3b8', marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>MANAJEMEN PENGGUNA</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', color: '#475569', fontSize: '0.9rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Pelanggan
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', color: '#475569', fontSize: '0.9rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="14" x="3" y="5" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="9" x2="9" y1="13" y2="13"/></svg>
              Member
            </div>
          </div>

          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#94a3b8', marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>LAPORAN</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', color: '#475569', fontSize: '0.9rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Penjualan
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', color: '#475569', fontSize: '0.9rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 Z"/></svg>
              Laporan
            </div>
          </div>

          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#94a3b8', marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>PENGATURAN</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', color: '#475569', fontSize: '0.9rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              Pengaturan
            </div>
            <div 
              onClick={() => setActiveTab('SYSTEM_USERS')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', backgroundColor: activeTab === 'SYSTEM_USERS' ? '#ecfdf5' : 'transparent', color: activeTab === 'SYSTEM_USERS' ? '#059669' : '#475569', borderRadius: '0.5rem', fontWeight: activeTab === 'SYSTEM_USERS' ? 'bold' : 'normal', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
              User Admin
            </div>
          </div>
        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            Logout
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* TOP NAVBAR */}
        <header style={{ height: '70px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem' }}>
          <div style={{ cursor: 'pointer' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#0f172a' }}>Admin</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Super Admin</div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e2e8f0', backgroundImage: `url('https://i.pravatar.cc/150?img=11')`, backgroundSize: 'cover' }}></div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>
              {activeTab === 'DASHBOARD' ? 'Super App Admin - Aviary Park' : 
               activeTab === 'SYSTEM_USERS' ? 'Manajemen Pengguna Sistem' : 
               activeTab === 'TICKET_PACKAGES' ? 'Pengaturan Paket Tiket' : 'Admin'}
            </h2>
            <Link href="/" style={{ color: 'var(--primary-color)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', border: '1px solid #10b981', padding: '0.4rem 1rem', borderRadius: '2rem' }}>
              &larr; Halaman Depan
            </Link>
          </div>

          {activeTab === 'DASHBOARD' && (
            <>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            
            {/* Panel Pengaturan Harga Dinamis dipindahkan ke TICKET_PACKAGES */}

        {/* Info Ringkas */}
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-around', gridColumn: '1 / -1', border: '1px solid #e2e8f0' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Member</p>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-dark)' }}>{users.length}</p>
          </div>
          <div style={{ width: '1px', height: '50px', background: 'var(--border-color)' }}></div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Kunjungan</p>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>
              {visitsData.reduce((acc, curr) => acc + curr.Kunjungan, 0)}
            </p>
          </div>
        </div>

      </div>

      {/* Area Grafik */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '1.5rem', height: '350px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Tren Pendaftaran Baru (Sales)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: 'var(--shadow-md)' }} />
              <Bar dataKey="Lunas" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} name="Sudah Lunas" />
              <Bar dataKey="BelumLunas" stackId="a" fill="#fca5a5" radius={[4, 4, 0, 0]} name="Belum Bayar" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '1.5rem', height: '350px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Frekuensi Kunjungan (Check-in)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={visitsData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: 'var(--shadow-md)' }} />
              <Line type="monotone" dataKey="Kunjungan" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* Tabel Data */}
      <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '2rem', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Database Pelanggan Lengkap</h3>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif (Sudah Bayar)</option>
            <option value="PENDING_PAYMENT">Menunggu Pembayaran</option>
          </select>
        </div>

        {loading ? (
          <p>Memuat data...</p>
        ) : users.filter(u => statusFilter === 'ALL' || u.status === statusFilter).length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Tidak ada data pelanggan untuk filter ini.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '1rem' }}>Nama</th>
                  <th style={{ padding: '1rem' }}>NIK</th>
                  <th style={{ padding: '1rem' }}>Tipe</th>
                  <th style={{ padding: '1rem' }}>Email / WA</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>Biometrik</th>
                  <th style={{ padding: '1rem' }}>Masa Aktif</th>
                  <th style={{ padding: '1rem' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.filter(u => statusFilter === 'ALL' || u.status === statusFilter).map((u, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: u.role === 'PRIMARY' ? 'white' : '#f8fafc' }}>
                    <td style={{ padding: '1rem', fontWeight: u.role === 'PRIMARY' ? 'bold' : 'normal' }}>
                      {u.role === 'PRIMARY' ? '👑 ' : '↳ '}{u.name}
                    </td>
                    <td style={{ padding: '1rem' }}>{u.nik}</td>
                    <td style={{ padding: '1rem', fontSize: '0.75rem' }}>{u.role}</td>
                    <td style={{ padding: '1rem' }}>
                      <div>{u.email}</div>
                      <a href={`https://wa.me/${u.phone?.replace(/\D/g, '') || ''}`} target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', fontSize: '0.85rem', marginTop: '0.25rem', fontWeight: '500' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        {u.phone}
                      </a>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ backgroundColor: u.status === 'ACTIVE' ? '#10b981' : '#f59e0b', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: u.face_descriptor ? '#10b981' : '#ef4444', fontWeight: 'bold', fontSize: '0.85rem' }}>
                      {u.face_descriptor ? '✓ Ada' : '✗ Kosong'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                      {u.activation_date ? (() => {
                        const date = new Date(u.activation_date);
                        date.setFullYear(date.getFullYear() + 1);
                        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                      })() : '-'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <button onClick={() => deleteUser(u.id)} style={{ padding: '0.4rem 0.6rem', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {activeTab === 'TICKET_PACKAGES' && (
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Pengaturan Harga Paket Tiket</h3>
          
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px' }}>
              <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Tambah Paket Baru</h4>
              <form onSubmit={addPackage} style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Nama Paket</label>
                  <input type="text" required value={newPkg.name} onChange={(e) => setNewPkg({...newPkg, name: e.target.value})} placeholder="Cth: Paket Couple" style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Min. Orang</label>
                    <input type="number" required min="1" value={newPkg.min_qty} onChange={(e) => setNewPkg({...newPkg, min_qty: Number(e.target.value)})} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Max. Orang</label>
                    <input type="number" required min="1" value={newPkg.max_qty} onChange={(e) => setNewPkg({...newPkg, max_qty: Number(e.target.value)})} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Harga Total (Rp)</label>
                  <input type="number" required value={newPkg.price} onChange={(e) => setNewPkg({...newPkg, price: e.target.value})} placeholder="Cth: 200000" style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem' }}>+ Tambah Paket</button>
              </form>
            </div>

            <div style={{ flex: '2 1 500px', overflowX: 'auto' }}>
              <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Daftar Paket Aktif</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>Nama Paket</th>
                    <th style={{ padding: '0.5rem' }}>Kapasitas</th>
                    <th style={{ padding: '0.5rem' }}>Harga</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>Belum ada paket. Silakan buat di sebelah kiri.</td></tr>
                  ) : packages.map(pkg => (
                    <tr key={pkg.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{pkg.name}</td>
                      <td style={{ padding: '0.5rem' }}>{pkg.min_qty === pkg.max_qty ? `${pkg.min_qty} Orang` : `${pkg.min_qty} - ${pkg.max_qty} Orang`}</td>
                      <td style={{ padding: '0.5rem' }}>Rp {pkg.price.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                        <button onClick={() => deletePackage(pkg.id)} style={{ padding: '0.2rem 0.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem' }}>Hapus</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'SYSTEM_USERS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Add System User Form */}
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Tambah Pengguna Sistem Baru</h3>
            <form onSubmit={addSystemUser} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.5rem' }}>Username</label>
                <input type="text" value={newSysUser.username} onChange={e => setNewSysUser({...newSysUser, username: e.target.value})} placeholder="Username unik..." style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} required />
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.5rem' }}>Kata Sandi (Password)</label>
                <input type="password" value={newSysUser.password} onChange={e => setNewSysUser({...newSysUser, password: e.target.value})} placeholder="Katasandi rahasia..." style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} required />
              </div>
              <div style={{ flex: '1 1 150px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.5rem' }}>Role (Akses)</label>
                <select value={newSysUser.role} onChange={e => setNewSysUser({...newSysUser, role: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                  <option value="GATE">GATE (Tiketing)</option>
                  <option value="ADMIN">ADMIN (Super Admin)</option>
                </select>
              </div>
              <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}>+ Tambah User</button>
            </form>
          </div>

          {/* System Users List */}
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '1rem' }}>Username</th>
                  <th style={{ padding: '1rem' }}>Role Akses</th>
                  <th style={{ padding: '1rem' }}>Dibuat Pada</th>
                  <th style={{ padding: '1rem', width: '100px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {systemUsers.map((u, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{u.username}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ backgroundColor: u.role === 'ADMIN' ? '#1d4ed8' : '#10b981', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                      {new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <button onClick={() => deleteSystemUser(u.id)} style={{ padding: '0.4rem 0.6rem', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Hapus</button>
                    </td>
                  </tr>
                ))}
                {systemUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Belum ada data user. Pastikan Anda sudah menjalankan SQL script untuk membuat tabel.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
      </main>
    </div>
  );
}
