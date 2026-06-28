"use client";

import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { useLanguage, LANGUAGES } from '@/contexts/LanguageContext';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [rawVisits, setRawVisits] = useState<any[]>([]);
  const [chartFilter, setChartFilter] = useState<number>(7);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING_PAYMENT'>('ALL');
  const [isLangOpen, setIsLangOpen] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('system_username');
      localStorage.removeItem('system_role');
      window.location.href = '/system-login';
    } catch (err) {
      console.error('Logout error', err);
    }
  };
  
  const { salesData, visitsData } = useMemo(() => {
    const dates = [];
    for (let i = chartFilter - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric' }));
    }
    
    const vCounts: Record<string, number> = {};
    rawVisits.forEach(v => {
      const date = new Date(v.visited_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric' });
      vCounts[date] = (vCounts[date] || 0) + 1;
    });
    
    const sCounts: Record<string, { Lunas: number; BelumLunas: number }> = {};
    users.forEach(m => {
      const date = new Date(m.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric' });
      if (!sCounts[date]) sCounts[date] = { Lunas: 0, BelumLunas: 0 };
      if (m.status === 'ACTIVE') sCounts[date].Lunas += 1;
      else sCounts[date].BelumLunas += 1;
    });

    return {
      salesData: dates.map(d => ({
        date: d,
        Lunas: sCounts[d]?.Lunas || 0,
        BelumLunas: sCounts[d]?.BelumLunas || 0
      })),
      visitsData: dates.map(d => ({
        date: d,
        Kunjungan: vCounts[d] || 0
      }))
    };
  }, [chartFilter, users, rawVisits]);
  // Member Database State
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };
  
  // Package Management State
  const [packages, setPackages] = useState<any[]>([]);
  const [newPkg, setNewPkg] = useState({ name: '', min_qty: 1, max_qty: 1, price: '' });

  const [loading, setLoading] = useState(true);

  // System Users State
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'SYSTEM_USERS' | 'TICKET_PACKAGES' | 'EVENTS' | 'SCHEDULES' | 'MEMBERS_DATABASE' | 'TRANSACTIONS'>('DASHBOARD');
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  
  // Events State
  const [events, setEvents] = useState<any[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', content: '', event_date: '', image_url: '', status: 'ACTIVE' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [newSysUser, setNewSysUser] = useState({ username: '', password: '', role: 'GATE' });

  // Schedules State
  const [schedules, setSchedules] = useState<any[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ title: '', description: '', start_time: '', end_time: '', location: '', image_url: '', status: 'ACTIVE' });
  const [scheduleImageFile, setScheduleImageFile] = useState<File | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  // Transactions State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [trxFilter, setTrxFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR'>('ALL');

  // Load saved tab on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab') as any;
      if (tabParam) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Sync tab changes to URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const currentUrlTab = searchParams.get('tab') || 'DASHBOARD';
      
      if (currentUrlTab !== activeTab) {
        const url = new URL(window.location.href);
        if (activeTab === 'DASHBOARD') {
          url.searchParams.delete('tab');
        } else {
          url.searchParams.set('tab', activeTab);
        }
        window.history.pushState({ tab: activeTab }, '', url.toString());
      }
    }
  }, [activeTab]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const searchParams = new URLSearchParams(window.location.search);
      setActiveTab((searchParams.get('tab') as any) || 'DASHBOARD');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
    } else if (activeTab === 'EVENTS') {
      fetchEvents();
    } else if (activeTab === 'SCHEDULES') {
      fetchSchedules();
    } else if (activeTab === 'TRANSACTIONS') {
      fetchTransactions();
    }
  }, [activeTab, trxFilter]);

  async function fetchTransactions() {
    try {
      const tRes = await fetch('/api/admin/transactions');
      const tJson = await tRes.json();
      let data = tJson.data || [];
      const error = null;
      
      const now = new Date();
      if (trxFilter === 'TODAY') {
        now.setHours(0, 0, 0, 0);
        data = data.filter((t: any) => new Date(t.created_at) >= now);
      } else if (trxFilter === 'WEEK') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        data = data.filter((t: any) => new Date(t.created_at) >= weekAgo);
      } else if (trxFilter === 'MONTH') {
        const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
        data = data.filter((t: any) => new Date(t.created_at) >= monthAgo);
      } else if (trxFilter === 'YEAR') {
        const yearAgo = new Date(now.getFullYear(), 0, 1);
        data = data.filter((t: any) => new Date(t.created_at) >= yearAgo);
      }

      if (data && !error) setTransactions(data);
    } catch (e) {
      console.log('Transactions table might not exist yet.', e);
    }
  }

  async function fetchSchedules() {
    const res = await fetch('/api/admin/schedules'); const json = await res.json(); const data = json.data;
    if (data) setSchedules(data);
  }

  async function fetchEvents() {
    const res = await fetch('/api/admin/events'); const json = await res.json(); const data = json.data;
    if (data) setEvents(data);
  }

  const saveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.description) return;
    
    // Tampilkan loading state jika perlu, tapi untuk sekarang pakai alert dasar
    
    try {
      let finalImageUrl = newEvent.image_url;

      // Jika user memilih file gambar, upload ke bucket 'events' terlebih dahulu
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('events')
          .upload(fileName, imageFile);

        if (uploadError) {
          throw new Error('Gagal mengunggah gambar: ' + uploadError.message);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('events')
          .getPublicUrl(fileName);

        finalImageUrl = publicUrl;
      }

      const res = await fetch('/api/admin/events', { method: 'POST', body: JSON.stringify({ ...newEvent, image_url: finalImageUrl }) });
      const json = await res.json();
      const error = json.error ? new Error(json.error) : null;
      if (error) throw error;
      
      toast.success('Event berhasil ditambahkan!');
      setShowEventForm(false);
      setNewEvent({ title: '', description: '', content: '', event_date: '', image_url: '', status: 'ACTIVE' });
      setImageFile(null);
      fetchEvents();
    } catch (err: any) {
      toast.error('Gagal menambah event: ' + err.message);
    }
  };

  const toggleEventStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await fetch('/api/admin/events', { method: 'PUT', body: JSON.stringify({ id, status: newStatus }) });
    fetchEvents();
  };

  const saveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedule.title || !newSchedule.start_time || !newSchedule.end_time) return;
    
    try {
      let finalImageUrl = newSchedule.image_url;

      if (scheduleImageFile) {
        const fileExt = scheduleImageFile.name.split('.').pop();
        const fileName = `${Date.now()}-sched-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('events')
          .upload(fileName, scheduleImageFile);

        if (uploadError) throw new Error('Gagal mengunggah gambar: ' + uploadError.message);

        const { data: { publicUrl } } = supabase.storage
          .from('events')
          .getPublicUrl(fileName);

        finalImageUrl = publicUrl;
      }

      if (editingScheduleId) {
        const res = await fetch('/api/admin/schedules', { method: 'PUT', body: JSON.stringify({ id: editingScheduleId, ...newSchedule, image_url: finalImageUrl }) });
        const json = await res.json();
        const error = json.error ? new Error(json.error) : null;
        if (error) throw error;
        toast.success('Jadwal berhasil diubah!');
      } else {
        const res = await fetch('/api/admin/schedules', { method: 'POST', body: JSON.stringify({ ...newSchedule, image_url: finalImageUrl }) });
        const json = await res.json();
        const error = json.error ? new Error(json.error) : null;
        if (error) throw error;
        toast.success('Jadwal berhasil ditambahkan!');
      }
      
      setShowScheduleForm(false);
      setEditingScheduleId(null);
      setNewSchedule({ title: '', description: '', start_time: '', end_time: '', location: '', image_url: '', status: 'ACTIVE' });
      setScheduleImageFile(null);
      fetchSchedules();
    } catch (err: any) {
      toast.error('Terjadi kesalahan: ' + err.message);
    }
  };

  const deleteSchedule = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus jadwal ini?')) {
      await fetch('/api/admin/schedules?id=' + id, { method: 'DELETE' });
      fetchSchedules();
    }
  };

  const toggleScheduleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await fetch('/api/admin/schedules', { method: 'PUT', body: JSON.stringify({ id, status: newStatus }) });
    fetchSchedules();
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Hapus event ini?')) return;
    const res = await fetch('/api/admin/events?id=' + id, { method: 'DELETE' });
    const json = await res.json();
    const error = json.error ? new Error(json.error) : null;
    if (!error) fetchEvents();
    else toast.error('Gagal menghapus event: ' + error.message);
  };

  async function fetchSystemUsers() {
    const res = await fetch('/api/admin/system_users'); const json = await res.json(); const { data, error } = json;
    if (data && !error) setSystemUsers(data);
  }

  const addSystemUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSysUser.username || !newSysUser.password) return;
    
    const res = await fetch('/api/admin/system_users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: newSysUser.username,
        password: newSysUser.password,
        role: newSysUser.role
      })
    });
    
    if (!res.ok) {
      toast.error('Gagal menambah akun admin!');
      return;
    } else {
      setNewSysUser({ username: '', password: '', role: 'GATE' });
      toast.success('User berhasil ditambahkan!');
      fetchSystemUsers();
    }
  };

  const deleteSystemUser = async (id: string) => {
    if (!confirm('Yakin ingin menghapus user ini?')) return;
    const res = await fetch('/api/admin/system_users?id=' + id, { method: 'DELETE' });
    const json = await res.json();
    const error = json.error ? new Error(json.error) : null;
    if (!error) fetchSystemUsers();
    else toast.error('Gagal menghapus user: ' + error.message);
  };

  async function fetchPackages() {
    const res = await fetch('/api/public/packages'); const json = await res.json(); const data = json.data;
    if (data) setPackages(data);
  }

  async function fetchData() {
    // 1. Fetch Users
    const resM = await fetch('/api/admin/members'); const jsonM = await resM.json(); const membersData = jsonM.data;
    if (membersData) {
      const primaries = membersData.filter((m: any) => m.role === 'PRIMARY');
      const dependents = membersData.filter((m: any) => m.role !== 'PRIMARY');
      
      let groupedUsers: any[] = [];
      
      // Push primary then their dependents
      primaries.forEach((p: any) => {
        groupedUsers.push(p);
        const related = dependents.filter((d: any) => d.group_id === p.group_id);
        groupedUsers.push(...related);
      });
      
      // Push any dependents that somehow don't have a primary in the fetched data (orphan check)
      const orphaned = dependents.filter((d: any) => !primaries.find((p: any) => p.group_id === d.group_id));
      groupedUsers.push(...orphaned);
      
      setUsers(groupedUsers);
    }

    // 2. Fetch Packages
    await fetchPackages();

    // 3. Fetch Visits & Aggregate for Chart
    const vRes = await fetch('/api/admin/visits'); const vJson = await vRes.json(); const vData = vJson.data;
    if (vData) setRawVisits(vData);

    setLoading(false);
  }

  const addPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPkg.name || !newPkg.price) return;
    
    try {
      const res = await fetch('/api/admin/packages/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPkg.name,
          min_qty: newPkg.min_qty,
          max_qty: newPkg.max_qty,
          price: newPkg.price
        })
      });
      const data = await res.json();
      
      if (!res.ok || data.error) {
        toast.error('Gagal menambah paket: ' + (data.error || 'Unknown error'));
      } else {
        setNewPkg({ name: '', min_qty: 1, max_qty: 1, price: '' });
        toast.success('Paket berhasil ditambahkan!');
        fetchPackages();
      }
    } catch (err: any) {
      toast.error('Gagal menambah paket: ' + err.message);
    }
  };

  const deletePackage = async (id: string) => {
    if (!confirm('Hapus paket ini?')) return;
    try {
      const res = await fetch(`/api/admin/packages/delete?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error('Gagal menghapus paket: ' + (data.error || 'Unknown error'));
      } else {
        fetchPackages();
      }
    } catch (err: any) {
      toast.error('Gagal menghapus paket: ' + err.message);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Hapus pelanggan ini? Tindakan ini tidak dapat dibatalkan.')) return;
    try {
      const res = await fetch(`/api/admin/members/delete?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error('Gagal menghapus pelanggan: ' + (data.error || 'Unknown error'));
      } else {
        fetchData();
      }
    } catch (err: any) {
      toast.error('Gagal menghapus pelanggan: ' + err.message);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', color: '#334155' }}>
      
      {/* Very faint background pattern for premium feel without being busy */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: '100%',
        zIndex: 0,
        background: `url('/aviary_pattern.png') center / cover`,
        opacity: 0.03,
        pointerEvents: 'none',
      }}></div>

      {/* SIDEBAR */}
      <aside style={{ 
        position: 'relative', zIndex: 1, width: '260px', overflow: 'hidden',
        backgroundColor: '#022c22', display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0,0,0,0.05)'
      }}>
        {/* Plant Motif Pattern Overlay */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: `url('/aviary_pattern.png') left top / cover`,
          opacity: 0.1, pointerEvents: 'none', zIndex: 0
        }}></div>
        
        <div style={{ position: 'relative', zIndex: 1, width: '260px', padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
          
          {/* Hanging Logo Tab */}
          <div style={{ 
              position: 'relative', padding: '1rem 2rem 1.5rem 2rem',
              marginBottom: '2rem', marginTop: '-1.5rem', alignSelf: 'center', 
              display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: '#f0fdf4', transform: 'perspective(150px) rotateX(-10deg)',
              transformOrigin: 'top', borderBottomLeftRadius: '1.5rem', borderBottomRightRadius: '1.5rem',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: -1
            }}></div>
            <img src="/logo.png" alt="Aviary Park Indonesia" style={{ height: '70px', width: 'auto' }} />
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.2rem', paddingLeft: '0.5rem', marginTop: '1rem' }}>Dashboard</p>
            <div 
              onClick={() => setActiveTab('DASHBOARD')}
              style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', backgroundColor: activeTab === 'DASHBOARD' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'DASHBOARD' ? '#ffffff' : '#94a3b8', borderRadius: '0.5rem', fontWeight: activeTab === 'DASHBOARD' ? '600' : '400', cursor: 'pointer', borderLeft: activeTab === 'DASHBOARD' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Dashboard
            </div>

            <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.2rem', paddingLeft: '0.5rem', marginTop: '1rem' }}>DATABASE</p>
            <div 
              onClick={() => setActiveTab('MEMBERS_DATABASE')}
              style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', backgroundColor: activeTab === 'MEMBERS_DATABASE' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'MEMBERS_DATABASE' ? '#ffffff' : '#94a3b8', borderRadius: '0.5rem', fontWeight: activeTab === 'MEMBERS_DATABASE' ? '600' : '400', cursor: 'pointer', borderLeft: activeTab === 'MEMBERS_DATABASE' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Database Member
            </div>

            <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.2rem', paddingLeft: '0.5rem', marginTop: '1rem' }}>MANAJEMEN TIKET</p>
            <div 
              onClick={() => setActiveTab('TICKET_PACKAGES')}
              style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', backgroundColor: activeTab === 'TICKET_PACKAGES' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'TICKET_PACKAGES' ? '#ffffff' : '#94a3b8', borderRadius: '0.5rem', fontWeight: activeTab === 'TICKET_PACKAGES' ? '600' : '400', cursor: 'pointer', borderLeft: activeTab === 'TICKET_PACKAGES' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
              Paket Tiket
            </div>
            <div 
              onClick={() => setActiveTab('TRANSACTIONS')}
              style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', backgroundColor: activeTab === 'TRANSACTIONS' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'TRANSACTIONS' ? '#ffffff' : '#94a3b8', borderRadius: '0.5rem', fontWeight: activeTab === 'TRANSACTIONS' ? '600' : '400', cursor: 'pointer', borderLeft: activeTab === 'TRANSACTIONS' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Riwayat Transaksi
            </div>
            
            <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.2rem', paddingLeft: '0.5rem', marginTop: '1rem' }}>PENGATURAN</p>
            <div 
              onClick={() => setActiveTab('EVENTS')}
              style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', backgroundColor: activeTab === 'EVENTS' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'EVENTS' ? '#ffffff' : '#94a3b8', borderRadius: '0.5rem', fontWeight: activeTab === 'EVENTS' ? '600' : '400', cursor: 'pointer', borderLeft: activeTab === 'EVENTS' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/></svg>
              Event & Pengumuman
            </div>
            <div 
              onClick={() => setActiveTab('SCHEDULES')}
              style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', backgroundColor: activeTab === 'SCHEDULES' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'SCHEDULES' ? '#ffffff' : '#94a3b8', borderRadius: '0.5rem', fontWeight: activeTab === 'SCHEDULES' ? '600' : '400', cursor: 'pointer', borderLeft: activeTab === 'SCHEDULES' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Jadwal Aktivitas
            </div>
            <div 
              onClick={() => setActiveTab('SYSTEM_USERS')}
              style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', backgroundColor: activeTab === 'SYSTEM_USERS' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'SYSTEM_USERS' ? '#ffffff' : '#94a3b8', borderRadius: '0.5rem', fontWeight: activeTab === 'SYSTEM_USERS' ? '600' : '400', cursor: 'pointer', borderLeft: activeTab === 'SYSTEM_USERS' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
              User Admin
            </div>
          </nav>

          <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
            <div onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', color: '#ef4444', fontWeight: '600', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
              Logout
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* TOP NAVBAR */}
        <header style={{ height: 'auto', minHeight: '70px', backgroundColor: 'transparent', borderBottom: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button 
              style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            </button>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 0.25rem 0' }}>Selamat datang kembali, Admin!</h1>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>Siap memantau sistem Aviary Park hari ini?</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            
            {/* Language Selector */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setIsLangOpen(!isLangOpen)}
                style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'}
                onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                <span className="notranslate" translate="no" style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#0f172a' }}>
                  {LANGUAGES.find(l => l.code === language)?.code.toUpperCase() || 'ID'}
                </span>
              </button>

              {isLangOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.75rem', background: 'white', borderRadius: '1rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', width: '240px', overflow: 'hidden', zIndex: 50, animation: 'fadeIn 0.2s ease-out' }}>
                  <div style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                    <p style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#0f172a' }}>{t('select_language')}</p>
                  </div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {LANGUAGES.map((lang) => (
                      <button 
                        key={lang.code}
                        onClick={() => { setLanguage(lang.code as any); setIsLangOpen(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem 1rem', background: language === lang.code ? '#f0fdf4' : 'transparent', border: 'none', color: language === lang.code ? '#059669' : '#334155', fontWeight: language === lang.code ? '600' : '400', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}
                        onMouseOver={(e) => { if(language !== lang.code) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                        onMouseOut={(e) => { if(language !== lang.code) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <span className="notranslate" translate="no" style={{ fontSize: '1.1rem' }}>{lang.flag}</span>
                        <span className="notranslate" translate="no">{lang.name}</span>
                        {language === lang.code && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 'auto' }}><polyline points="20 6 9 17 4 12"/></svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            </button>

          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>


          {activeTab === 'DASHBOARD' && (
            <>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
            
            {/* Card 1: Total Member */}
            <div style={{ backgroundColor: 'white', borderRadius: '1.25rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', zIndex: 2 }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '1rem', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div>
                  <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 0.25rem 0', fontWeight: '600' }}>Total Member</p>
                  <p style={{ fontSize: '2.5rem', fontWeight: '800', color: '#059669', margin: 0, lineHeight: 1 }}>{users.length}</p>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.5rem 0 0 0' }}>Member terdaftar di sistem</p>
                </div>
              </div>
              <div style={{ position: 'absolute', right: 0, bottom: 0, opacity: 0.9, zIndex: 1, pointerEvents: 'none', height: '100%', width: '45%' }}>
                <img src="/member_card_bg.png" style={{ height: '100%', width: '100%', objectFit: 'cover', objectPosition: 'left center' }} />
              </div>
            </div>

            {/* Card 2: Total Kunjungan */}
            <div style={{ backgroundColor: 'white', borderRadius: '1.25rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', zIndex: 2 }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '1rem', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>
                </div>
                <div>
                  <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 0.25rem 0', fontWeight: '600' }}>Total Kunjungan</p>
                  <p style={{ fontSize: '2.5rem', fontWeight: '800', color: '#3b82f6', margin: 0, lineHeight: 1 }}>
                    {visitsData.reduce((acc, curr) => acc + curr.Kunjungan, 0)}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.5rem 0 0 0' }}>Total kunjungan (all time)</p>
                </div>
              </div>
              <div style={{ position: 'absolute', right: 0, bottom: 0, opacity: 0.9, zIndex: 1, pointerEvents: 'none', height: '100%', width: '45%' }}>
                <img src="/visit_card_bg.png" style={{ height: '100%', width: '100%', objectFit: 'cover', objectPosition: 'left center' }} />
              </div>
            </div>

          </div>

      {/* Area Grafik */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* Sales Chart Card */}
        <div style={{ backgroundColor: 'white', borderRadius: '1.25rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', padding: '1.5rem', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.4rem', backgroundColor: '#ecfdf5', borderRadius: '0.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: '700' }}>Tren Pendaftaran Baru (Sales)</h3>
            </div>
            <select 
              value={chartFilter}
              onChange={(e) => setChartFilter(Number(e.target.value))}
              style={{ fontSize: '0.75rem', color: '#64748b', padding: '0.25rem 0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem', backgroundColor: 'white', cursor: 'pointer', outline: 'none' }}
            >
              <option value={7}>7 Hari Terakhir</option>
              <option value={14}>14 Hari Terakhir</option>
              <option value={30}>30 Hari Terakhir</option>
            </select>
          </div>
          
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }} barCategoryGap={10}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={{ stroke: '#f1f5f9' }} tick={{ fill: '#94a3b8' }} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '1rem' }} />
                <Bar dataKey="Lunas" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} name="Sudah Lunas" />
                <Bar dataKey="BelumLunas" stackId="a" fill="#fca5a5" radius={[4, 4, 0, 0]} name="Belum Bayar" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                Sudah Lunas
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>
                {salesData.reduce((acc, curr) => acc + (curr.Lunas || 0), 0)}
              </div>
            </div>
            <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></div>
                Belum Bayar
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>
                {salesData.reduce((acc, curr) => acc + (curr.BelumLunas || 0), 0)}
              </div>
            </div>
            <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#3b82f6', marginBottom: '0.5rem' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                Total
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>
                {salesData.reduce((acc, curr) => acc + (curr.Lunas || 0) + (curr.BelumLunas || 0), 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Visit Chart Card */}
        <div style={{ backgroundColor: 'white', borderRadius: '1.25rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', padding: '1.5rem', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.4rem', backgroundColor: '#eff6ff', borderRadius: '0.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: '700' }}>Frekuensi Kunjungan (Check-in)</h3>
            </div>
            <select 
              value={chartFilter}
              onChange={(e) => setChartFilter(Number(e.target.value))}
              style={{ fontSize: '0.75rem', color: '#64748b', padding: '0.25rem 0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem', backgroundColor: 'white', cursor: 'pointer', outline: 'none' }}
            >
              <option value={7}>7 Hari Terakhir</option>
              <option value={14}>14 Hari Terakhir</option>
              <option value={30}>30 Hari Terakhir</option>
            </select>
          </div>
          
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visitsData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorVisit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={{ stroke: '#f1f5f9' }} tick={{ fill: '#94a3b8' }} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="Kunjungan" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVisit)" activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#eff6ff', borderRadius: '0.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Kunjungan Hari Ini</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>
                  {visitsData[visitsData.length - 1]?.Kunjungan || 0}
                </div>
              </div>
            </div>
            <div style={{ flex: 1, backgroundColor: '#ecfdf5', padding: '1rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#dcfce7', borderRadius: '0.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M5 12l5 5L20 7"/></svg>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#064e3b' }}>Total Kunjungan ({chartFilter} Hari)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#064e3b' }}>
                  {visitsData.reduce((acc, curr) => acc + curr.Kunjungan, 0)}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      </>
      )}

      {activeTab === 'MEMBERS_DATABASE' && (
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Daftar Member</h3>
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
                  {(() => {
                    const filteredUsers = users.filter(u => statusFilter === 'ALL' || u.status === statusFilter);
                    const primaryUsers = filteredUsers.filter(u => u.role === 'PRIMARY');
                    const paginatedPrimaryUsers = primaryUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                    
                    const visibleUsers: any[] = [];
                    paginatedPrimaryUsers.forEach(p => {
                      visibleUsers.push(p);
                      if (expandedGroups[p.group_id]) {
                        const dependents = filteredUsers.filter(u => u.role !== 'PRIMARY' && u.group_id === p.group_id);
                        visibleUsers.push(...dependents);
                      }
                    });

                    return visibleUsers.map((u, i) => {
                      const dependentsCount = filteredUsers.filter(dep => dep.role !== 'PRIMARY' && dep.group_id === u.group_id).length;
                      
                      return (
                        <tr key={u.id || i} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: u.role === 'PRIMARY' ? 'white' : '#f8fafc' }}>
                          <td style={{ padding: '1rem', fontWeight: u.role === 'PRIMARY' ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {u.role === 'PRIMARY' ? '👑 ' : <span style={{ color: '#cbd5e1', paddingLeft: '1.5rem' }}>↳ </span>}
                            {u.name}
                            
                            {u.role === 'PRIMARY' && dependentsCount > 0 && (
                              <button 
                                onClick={() => toggleGroup(u.group_id)}
                                style={{ 
                                  marginLeft: '0.5rem', padding: '0.2rem 0.5rem', fontSize: '0.7rem', 
                                  backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '1rem', 
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem',
                                  color: '#64748b', fontWeight: 'bold'
                                }}
                              >
                                {expandedGroups[u.group_id] ? '▲ Tutup' : `▼ Lihat ${dependentsCount} Keluarga`}
                              </button>
                            )}
                          </td>
                          <td style={{ padding: '1rem' }}>{u.nik}</td>
                          <td style={{ padding: '1rem', fontSize: '0.75rem' }}>{u.role}</td>
                          <td style={{ padding: '1rem' }}>
                            <div>{u.email}</div>
                            <a href={`https://wa.me/${u.phone?.replace(/\D/g, '') || ''}`} target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', fontSize: '0.85rem', marginTop: '0.25rem', fontWeight: '500' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
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
                      );
                    });
                  })()}
                </tbody>
              </table>

              {/* Pagination Controls */}
              {(() => {
                const filteredUsers = users.filter(u => statusFilter === 'ALL' || u.status === statusFilter);
                const primaryUsers = filteredUsers.filter(u => u.role === 'PRIMARY');
                const totalPages = Math.ceil(primaryUsers.length / itemsPerPage);
                
                if (totalPages <= 1) return null;

                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderBottomLeftRadius: '1rem', borderBottomRightRadius: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Menampilkan Halaman <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{currentPage}</span> dari <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{totalPages}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', backgroundColor: currentPage === 1 ? '#e2e8f0' : 'white', color: currentPage === 1 ? '#94a3b8' : '#0f172a', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '500', fontSize: '0.85rem' }}
                      >
                        Sebelumnya
                      </button>
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', backgroundColor: currentPage === totalPages ? '#e2e8f0' : 'white', color: currentPage === totalPages ? '#94a3b8' : '#0f172a', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: '500', fontSize: '0.85rem' }}
                      >
                        Selanjutnya
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
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

      {activeTab === 'EVENTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: '#64748b' }}>Kelola papan pengumuman dan acara taman.</p>
            <button 
              onClick={() => setShowEventForm(!showEventForm)}
              style={{ padding: '0.75rem 1.5rem', backgroundColor: '#059669', color: 'white', borderRadius: '0.5rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
            >
              {showEventForm ? 'Batal' : '+ Tambah Event'}
            </button>
          </div>

          {showEventForm && (
            <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Tambah Event Baru</h3>
              <form onSubmit={saveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Judul Event / Berita</label>
                  <input type="text" required value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Tanggal & Waktu</label>
                    <input type="datetime-local" required value={newEvent.event_date} onChange={e => setNewEvent({...newEvent, event_date: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Upload Gambar (Poster)</label>
                    <input type="file" accept="image/*" onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setImageFile(e.target.files[0]);
                      }
                    }} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Deskripsi Singkat (Tampil di Card)</label>
                  <textarea required rows={2} value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Isi Berita / Detail Event Lengkap (Blog)</label>
                  <textarea required rows={6} value={newEvent.content} onChange={e => setNewEvent({...newEvent, content: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                </div>

                <button type="submit" style={{ padding: '0.75rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '0.5rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginTop: '1rem' }}>
                  Simpan Event
                </button>
              </form>
            </div>
          )}

          {events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '1rem', border: '1px dashed #cbd5e1' }}>
              <p style={{ color: '#94a3b8' }}>Belum ada event yang dibuat.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {events.map(event => (
                <div key={event.id} style={{ background: 'white', borderRadius: '1rem', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                  {event.image_url ? (
                    <img src={event.image_url} alt={event.title} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '160px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Tidak ada gambar</div>
                  )}
                  <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ alignSelf: 'flex-start', padding: '0.25rem 0.75rem', background: '#ecfdf5', color: '#059669', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                      {new Date(event.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#0f172a' }}>{event.title}</h3>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{event.description}</p>
                    
                    <button onClick={() => deleteEvent(event.id)} style={{ width: '100%', padding: '0.5rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}>
                      Hapus Event
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {activeTab === 'SCHEDULES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: '#64748b' }}>Kelola jadwal aktivitas berulang harian taman.</p>
            <button 
              onClick={() => {
                setShowScheduleForm(!showScheduleForm);
                if (showScheduleForm) {
                  setEditingScheduleId(null);
                  setNewSchedule({ title: '', description: '', start_time: '', end_time: '', location: '', image_url: '', status: 'ACTIVE' });
                  setScheduleImageFile(null);
                }
              }}
              style={{ padding: '0.75rem 1.5rem', backgroundColor: '#059669', color: 'white', borderRadius: '0.5rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
            >
              {showScheduleForm ? 'Batal' : '+ Tambah Jadwal'}
            </button>
          </div>

          {showScheduleForm && (
            <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                {editingScheduleId ? 'Ubah Jadwal Aktivitas' : 'Tambah Jadwal Baru'}
              </h3>
              <form onSubmit={saveSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Judul Aktivitas</label>
                  <input type="text" required value={newSchedule.title} onChange={e => setNewSchedule({...newSchedule, title: e.target.value})} placeholder="Misal: Bird Feeding" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Jam Mulai</label>
                    <input type="time" required value={newSchedule.start_time} onChange={e => setNewSchedule({...newSchedule, start_time: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Jam Selesai</label>
                    <input type="time" required value={newSchedule.end_time} onChange={e => setNewSchedule({...newSchedule, end_time: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Upload Foto</label>
                    <input type="file" accept="image/*" onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setScheduleImageFile(e.target.files[0]);
                      }
                    }} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Lokasi</label>
                    <input type="text" value={newSchedule.location} onChange={e => setNewSchedule({...newSchedule, location: e.target.value})} placeholder="Misal: Area Danau Flamingo" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Deskripsi Singkat</label>
                    <input type="text" value={newSchedule.description} onChange={e => setNewSchedule({...newSchedule, description: e.target.value})} placeholder="Beri makan burung flamingo langsung..." style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>

                <div>
                  <button type="submit" style={{ padding: '0.75rem 2rem', backgroundColor: '#0f172a', color: 'white', borderRadius: '0.5rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginTop: '1rem' }}>
                    {editingScheduleId ? 'Simpan Perubahan' : 'Simpan Jadwal'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '1rem 1.5rem', color: '#64748b', fontWeight: '600', fontSize: '0.875rem' }}>Jadwal</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#64748b', fontWeight: '600', fontSize: '0.875rem' }}>Waktu</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#64748b', fontWeight: '600', fontSize: '0.875rem' }}>Lokasi</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#64748b', fontWeight: '600', fontSize: '0.875rem' }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#64748b', fontWeight: '600', fontSize: '0.875rem' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                      Belum ada jadwal. Tambahkan jadwal baru untuk menampilkannya.
                    </td>
                  </tr>
                ) : schedules.map(schedule => (
                  <tr key={schedule.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1.5rem', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                        <div style={{ width: '64px', height: '64px', flexShrink: 0, borderRadius: '0.5rem', backgroundColor: '#e2e8f0', backgroundImage: schedule.image_url ? `url('${schedule.image_url}')` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <p style={{ fontWeight: 'bold', color: '#0f172a', margin: 0, fontSize: '1rem' }}>{schedule.title}</p>
                          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '600px', lineHeight: '1.5' }}>
                            {schedule.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1.5rem', color: '#334155', fontWeight: '500', verticalAlign: 'top' }}>
                      {schedule.start_time} - {schedule.end_time}
                    </td>
                    <td style={{ padding: '1.5rem', color: '#334155', verticalAlign: 'top' }}>
                      {schedule.location || '-'}
                    </td>
                    <td style={{ padding: '1.5rem', verticalAlign: 'top' }}>
                      <button 
                        onClick={() => toggleScheduleStatus(schedule.id, schedule.status)}
                        style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', backgroundColor: schedule.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2', color: schedule.status === 'ACTIVE' ? '#166534' : '#991b1b' }}
                      >
                        {schedule.status}
                      </button>
                    </td>
                    <td style={{ padding: '1.5rem', textAlign: 'right', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => {
                            setEditingScheduleId(schedule.id);
                            setNewSchedule({
                              title: schedule.title,
                              description: schedule.description,
                              start_time: schedule.start_time,
                              end_time: schedule.end_time,
                              location: schedule.location,
                              image_url: schedule.image_url,
                              status: schedule.status
                            });
                            setShowScheduleForm(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          style={{ padding: '0.5rem', backgroundColor: '#e0f2fe', color: '#0284c7', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
                          title="Edit"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button 
                          onClick={() => deleteSchedule(schedule.id)}
                          style={{ padding: '0.5rem', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
                          title="Hapus"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'TRANSACTIONS' && (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
            <select 
              value={trxFilter} 
              onChange={e => setTrxFilter(e.target.value as any)}
              style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', outline: 'none', cursor: 'pointer', backgroundColor: 'white', fontWeight: '500', color: '#334155', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            >
              <option value="ALL">Semua Waktu</option>
              <option value="TODAY">Hari Ini</option>
              <option value="WEEK">7 Hari Terakhir</option>
              <option value="MONTH">Bulan Ini</option>
              <option value="YEAR">Tahun Ini</option>
            </select>
          </div>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '4px solid #10b981' }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600', marginBottom: '0.5rem' }}>Total Pendapatan</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                Rp {transactions.filter(t => t.status === 'SUCCESS').reduce((sum, t) => sum + Number(t.amount || 0), 0).toLocaleString('id-ID')}
              </h3>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '4px solid #3b82f6' }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600', marginBottom: '0.5rem' }}>Total Transaksi (Sukses)</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                {transactions.filter(t => t.status === 'SUCCESS').length}
              </h3>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '4px solid #f59e0b' }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600', marginBottom: '0.5rem' }}>Tertunda</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                {transactions.filter(t => t.status === 'PENDING').length}
              </h3>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '4px solid #ef4444' }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600', marginBottom: '0.5rem' }}>Gagal</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                {transactions.filter(t => t.status === 'FAILED').length}
              </h3>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>Daftar Transaksi</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: '0.875rem' }}>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>Order ID</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>Nama Pembeli</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>Tanggal</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>Paket</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>Total (Rp)</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Belum ada data transaksi</td>
                  </tr>
                ) : transactions.map((trx, idx) => (
                  <tr key={trx.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: '#0f172a' }}>{trx.merchant_order_id}</td>
                    <td style={{ padding: '1rem 1.5rem', color: '#334155' }}>{trx.buyer_name || '-'}</td>
                    <td style={{ padding: '1rem 1.5rem', color: '#64748b', fontSize: '0.875rem' }}>{new Date(trx.created_at).toLocaleString('id-ID')}</td>
                    <td style={{ padding: '1rem 1.5rem', color: '#334155' }}>{trx.package_name || '-'}</td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: '#059669' }}>Rp {Number(trx.amount).toLocaleString('id-ID')}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '9999px', 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold', 
                        backgroundColor: trx.status === 'SUCCESS' ? '#dcfce7' : trx.status === 'PENDING' ? '#fef3c7' : '#fee2e2', 
                        color: trx.status === 'SUCCESS' ? '#166534' : trx.status === 'PENDING' ? '#92400e' : '#991b1b' 
                      }}>
                        {trx.status}
                      </span>
                    </td>
                  </tr>
                ))}
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
