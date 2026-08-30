"use client";

import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend } from 'recharts';
import { useLanguage, LANGUAGES } from '@/contexts/LanguageContext';
import FinancialReports from './_components/FinancialReports';
import AICopilot from './_components/AICopilot';
import ReportsTab from './_components/ReportsTab';
import MasterWahanaTab from './_components/MasterWahanaTab';

const PROVINCE_MAP: Record<string, string> = {
  '11': 'Aceh', '12': 'Sumut', '13': 'Sumbar', '14': 'Riau', '15': 'Jambi', '16': 'Sumsel', '17': 'Bengkulu', '18': 'Lampung', '19': 'Babel', '21': 'Kep. Riau',
  '31': 'DKI Jakarta', '32': 'Jawa Barat', '33': 'Jawa Tengah', '34': 'DIY', '35': 'Jawa Timur', '36': 'Banten',
  '51': 'Bali', '52': 'NTB', '53': 'NTT',
  '61': 'Kalbar', '62': 'Kalteng', '63': 'Kalsel', '64': 'Kaltim', '65': 'Kaltara',
  '71': 'Sulut', '72': 'Sulteng', '73': 'Sulsel', '74': 'Sultra', '75': 'Gorontalo', '76': 'Sulbar',
  '81': 'Maluku', '82': 'Malut',
  '91': 'Papua Barat', '94': 'Papua'
};

const extractDemographics = (nik: string) => {
  if (!nik || nik.length !== 16) return { gender: 'Unknown', age: 'Unknown', birthDate: '-', province: 'Lainnya' };
  
  const provCode = nik.substring(0, 2);
  const province = PROVINCE_MAP[provCode] || 'Lainnya';
  
  const dd = parseInt(nik.substring(6, 8));
  const mm = parseInt(nik.substring(8, 10));
  const yy = parseInt(nik.substring(10, 12));
  
  if (isNaN(dd) || isNaN(mm) || isNaN(yy)) return { gender: 'Unknown', age: 'Unknown', birthDate: '-', province };

  let gender = 'Laki-laki';
  let date = dd;
  if (dd > 40) {
    gender = 'Perempuan';
    date = dd - 40;
  }
  
  const currentYear = new Date().getFullYear();
  const currentYY = parseInt(currentYear.toString().substring(2));
  
  const fullYear = yy > currentYY ? 1900 + yy : 2000 + yy;
  const age = currentYear - fullYear;
  
  return { gender, age, birthDate: `${date}/${mm}/${fullYear}`, province };
};

const getRFMTag = (visitsCount: number, totalSpend: number, lastVisitDate: string | null) => {
  if (visitsCount === 0) return { label: 'Newbie', color: '#475569', bg: '#f1f5f9' };
  if (visitsCount >= 3 || totalSpend >= 500000) return { label: 'VIP Member', color: '#9a3412', bg: '#ffedd5' };
  
  if (lastVisitDate) {
    const daysSince = Math.floor((new Date().getTime() - new Date(lastVisitDate).getTime()) / (1000 * 3600 * 24));
    if (daysSince > 90) return { label: 'At Risk', color: '#991b1b', bg: '#fee2e2' };
  }
  
  if (visitsCount >= 2) return { label: 'Loyal', color: '#1e40af', bg: '#dbeafe' };
  return { label: 'Newbie', color: '#475569', bg: '#f1f5f9' };
};

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
  
  const { salesData, visitsData, topUsers, arrivalsData } = useMemo(() => {
    const dates = [];
    for (let i = chartFilter - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(`${d.getDate()}/${d.getMonth() + 1}`);
    }

    const vCounts: Record<string, number> = {};
    const uniqueVisitsPerDate: Record<string, Set<string>> = {};
    const userVisitsCount: Record<string, { count: number; name: string }> = {};
    const arrivalsMap: Record<string, { date: string; group_id: string; group_name: string; paxCount: number; members: Set<string> }> = {};

    rawVisits.forEach(v => {
      const timeStr = v.visited_at.endsWith('Z') || v.visited_at.includes('+') ? v.visited_at : v.visited_at + 'Z';
      const d = new Date(timeStr);
      const date = `${d.getDate()}/${d.getMonth() + 1}`;
      
      // Menghitung jumlah visitor UNIK per hari (bukan total berapa kali scan wajah)
      if (!uniqueVisitsPerDate[date]) uniqueVisitsPerDate[date] = new Set();
      if (v.member_id) uniqueVisitsPerDate[date].add(v.member_id);
      vCounts[date] = uniqueVisitsPerDate[date].size;

      if (v.member_id) {
        const member = users.find(u => u.id === v.member_id);
        const name = member ? member.name : 'Unknown User';
        if (!userVisitsCount[v.member_id]) {
          userVisitsCount[v.member_id] = { count: 0, name };
        }
        userVisitsCount[v.member_id].count += 1;

        if (member && member.group_id) {
          const arrivalKey = `${member.group_id}_${date}`;
          if (!arrivalsMap[arrivalKey]) {
            const primary = users.find(u => u.group_id === member.group_id && u.role === 'PRIMARY');
            arrivalsMap[arrivalKey] = {
              date,
              group_id: member.group_id,
              group_name: primary ? primary.name : name,
              paxCount: 0,
              members: new Set()
            };
          }
          arrivalsMap[arrivalKey].members.add(v.member_id);
          arrivalsMap[arrivalKey].paxCount = arrivalsMap[arrivalKey].members.size;
        }
      }
    });

    const sCounts: Record<string, { Lunas: number; BelumLunas: number }> = {};
    users.forEach(m => {
      const timeStr = m.created_at.endsWith('Z') || m.created_at.includes('+') ? m.created_at : m.created_at + 'Z';
      const d = new Date(timeStr);
      const date = `${d.getDate()}/${d.getMonth() + 1}`;
      if (!sCounts[date]) sCounts[date] = { Lunas: 0, BelumLunas: 0 };
      if (m.status === 'ACTIVE') sCounts[date].Lunas += 1;
      else sCounts[date].BelumLunas += 1;
    });

    const topUsers = Object.values(userVisitsCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const arrivalsData = Object.values(arrivalsMap).sort((a, b) => b.date.localeCompare(a.date));

    return {
      salesData: dates.map(d => ({
        date: d,
        Lunas: sCounts[d]?.Lunas || 0,
        BelumLunas: sCounts[d]?.BelumLunas || 0
      })),
      visitsData: dates.map(d => ({
        date: d,
        Kunjungan: vCounts[d] || 0
      })),
      topUsers,
      arrivalsData
    };
  }, [chartFilter, users, rawVisits]);
  // Member Database State
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<any>(null);
  
  // Live Scan state
  const [liveScanDateFilter, setLiveScanDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  const [liveScanCurrentPage, setLiveScanCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLogsPage, setAuditLogsPage] = useState(1);
  const [auditFilterAction, setAuditFilterAction] = useState('ALL');

  // Error Logs State
  const [errorLogs, setErrorLogs] = useState<any[]>([]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };
  
  // Package Management State
  const [packages, setPackages] = useState<any[]>([]);
  const [wahanas, setWahanas] = useState<any[]>([]);
  const [newPkg, setNewPkg] = useState({ name: '', min_qty: 1, max_qty: 1, price: '', selected_wahanas: [] as {wahana_id: string, quantity: number | string}[] });
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);

  // Bundling Wahana State (untuk Top-Up POS)
  const [bundles, setBundles] = useState<any[]>([]);
  const [newBundle, setNewBundle] = useState({ name: '', price: '', selected_wahanas: [] as {wahana_id: string, quantity: number | string}[] });
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  // System Users State
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'FINANCIAL' | 'REPORTS' | 'SYSTEM_USERS' | 'TICKET_PACKAGES' | 'EVENTS' | 'SCHEDULES' | 'MEMBERS_DATABASE' | 'LOYALTY_PROGRAM' | 'AUDIT_LOGS' | 'ERROR_LOGS' | 'MASTER_WAHANA'>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  
  // Events State
  const [events, setEvents] = useState<any[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', content: '', event_date: '', image_url: '', status: 'ACTIVE' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [newSysUser, setNewSysUser] = useState({ username: '', password: '', role: 'GATE', wahana_id: '' });

  // Schedules State
  const [schedules, setSchedules] = useState<any[]>([]);

  // POS Terminals States
  const [posTerminals, setPosTerminals] = useState<any[]>([]);
  const [newTerminalName, setNewTerminalName] = useState('');
  const [newTerminalCategory, setNewTerminalCategory] = useState('RESTO');
  const [newTerminalWahanaId, setNewTerminalWahanaId] = useState('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ title: '', description: '', start_time: '', end_time: '', location: '', image_url: '', status: 'ACTIVE' });
  const [scheduleImageFile, setScheduleImageFile] = useState<File | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  // Transactions State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [trxFilter, setTrxFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR'>('ALL');
  
  const fetchPosTerminals = async () => {
    try {
      const res = await fetch('/api/pos/terminals');
      const json = await res.json();
      if (json.success && json.data) {
        setPosTerminals(json.data);
      }
    } catch(e) { console.error(e); }
  };

  const handleAddTerminal = async () => {
    if(!newTerminalName) return;
    if(newTerminalCategory === 'WAHANA' && !newTerminalWahanaId) {
      toast.error('Pilih wahana untuk terminal ini terlebih dahulu!');
      return;
    }
    try {
      const res = await fetch('/api/pos/terminals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newTerminalName, 
          category: newTerminalCategory,
          wahana_id: newTerminalCategory === 'WAHANA' ? newTerminalWahanaId : null
        })
      });
      const json = await res.json();
      if(res.ok && json.success) {
        setNewTerminalName('');
        setNewTerminalWahanaId('');
        fetchPosTerminals();
        toast.success('Terminal berhasil ditambahkan!');
      } else {
        toast.error(json.error || 'Gagal menambah terminal');
      }
    } catch(e) { console.error(e); }
  };

  const handleDeleteTerminal = async (id: string) => {
    try {
      const res = await fetch(`/api/pos/terminals?id=${id}`, { method: 'DELETE' });
      if(res.ok) fetchPosTerminals();
    } catch(e) { console.error(e); }
  };

  const [dateFilter, setDateFilter] = useState<'TODAY'|'MONTH'|'YEAR'|'ALL'|'CUSTOM'>('ALL');
  const [financeFilter, setFinanceFilter] = useState<'TODAY' | 'MONTH' | 'YEAR' | 'ALL' | 'CUSTOM'>('MONTH');
  const [financeCustomDate, setFinanceCustomDate] = useState<string>('');

  // Loyalty Program & Business Leads State
  const [rewardsCatalog, setRewardsCatalog] = useState<any[]>([]);
  const [posTransactions, setPosTransactions] = useState<any[]>([]);
  const [pointMutations, setPointMutations] = useState<any[]>([]);
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [newReward, setNewReward] = useState({ name: '', description: '', points_required: 100, reward_type: 'VOUCHER_50K', is_active: true });
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);

  // Dashboard Stats useMemo (separate to avoid hoisting issues)
  const dashboardStats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    // Revenue Today vs Yesterday
    let revenueToday = 0;
    let revenueYesterday = 0;

    transactions.forEach(t => {
      const tDate = new Date(t.created_at);
      const isPaid = ['PAID', 'SUCCESS', 'COMPLETED'].includes(t.payment_status || t.status);
      const amount = Number(t.amount || t.total_amount || 0);

      if (isPaid) {
        if (tDate >= todayStart && tDate < tomorrowStart) {
          revenueToday += amount;
        } else if (tDate >= yesterdayStart && tDate < todayStart) {
          revenueYesterday += amount;
        }
      }
    });

    // POS Revenue Today
    posTransactions.forEach(t => {
      const tDate = new Date(t.created_at);
      if (tDate >= todayStart && tDate < tomorrowStart) {
        revenueToday += Number(t.amount || 0);
      } else if (tDate >= yesterdayStart && tDate < todayStart) {
        revenueYesterday += Number(t.amount || 0);
      }
    });

    const revenueGrowth = revenueYesterday > 0
      ? ((revenueToday - revenueYesterday) / revenueYesterday * 100)
      : revenueToday > 0 ? 100 : 0;

    // Conversion Rate (PENDING → SUCCESS)
    const totalTransactions = transactions.length;
    const successfulTransactions = transactions.filter(t =>
      ['PAID', 'SUCCESS', 'COMPLETED'].includes(t.payment_status || t.status)
    ).length;
    const pendingTransactions = transactions.filter(t =>
      ['PENDING', 'PENDING_PAYMENT'].includes(t.payment_status || t.status)
    ).length;
    const conversionRate = totalTransactions > 0
      ? (successfulTransactions / totalTransactions * 100)
      : 0;

    // Expired Memberships Warning
    const expiredMembers = users.filter(m => {
      if (!m.activation_date) return false;
      const expiry = new Date(m.activation_date);
      expiry.setFullYear(expiry.getFullYear() + 1);
      return expiry < now && m.status === 'ACTIVE';
    });

    const soonExpiring = users.filter(m => {
      if (!m.activation_date || m.status !== 'ACTIVE') return false;
      const expiry = new Date(m.activation_date);
      expiry.setFullYear(expiry.getFullYear() + 1);
      const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
    });

    // Top Performing Package
    const packageSales: Record<string, { count: number; name: string; revenue: number }> = {};
    transactions.forEach(t => {
      const pkgName = t.package_name || 'Lainnya';
      if (!packageSales[pkgName]) {
        packageSales[pkgName] = { count: 0, name: pkgName, revenue: 0 };
      }
      packageSales[pkgName].count += 1;
      if (['PAID', 'SUCCESS', 'COMPLETED'].includes(t.payment_status || t.status)) {
        packageSales[pkgName].revenue += Number(t.amount || t.total_amount || 0);
      }
    });
    const topPackage = Object.values(packageSales)
      .sort((a, b) => b.revenue - a.revenue)[0] || null;

    // Check if today is holiday or weekend
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Indonesian holidays (basic check for common ones)
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const holidays = [
      { month: 1, day: 1, name: 'Tahun Baru' },
      { month: 8, day: 17, name: 'HUT RI' },
      { month: 12, day: 25, name: 'Natal' },
    ];
    const todayHoliday = holidays.find(h => h.month === month && h.day === day);

    return {
      revenueToday,
      revenueYesterday,
      revenueGrowth,
      conversionRate,
      totalTransactions,
      successfulTransactions,
      pendingTransactions,
      expiredMembers: expiredMembers.length,
      soonExpiring: soonExpiring.length,
      expiredMemberDetails: expiredMembers.slice(0, 5),
      soonExpiringDetails: soonExpiring.slice(0, 5),
      topPackage,
      isWeekend,
      todayHoliday,
    };
  }, [transactions, posTransactions, users]);

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

    const trxChannel = supabase.channel('public:transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchTransactions();
        fetchLoyaltyData();
      })
      .subscribe();

    const posChannel = supabase.channel('public:pos_transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_transactions' }, fetchLoyaltyData)
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(visitsChannel);
      supabase.removeChannel(pkgsChannel);
      supabase.removeChannel(trxChannel);
      supabase.removeChannel(posChannel);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'SYSTEM_USERS') {
      fetchSystemUsers();
    } else if (activeTab === 'EVENTS') {
      fetchEvents();
    } else if (activeTab === 'SCHEDULES') {
      fetchSchedules();
    } else if (activeTab === 'AUDIT_LOGS') {
      fetchAuditLogs();
    } else if (activeTab === 'ERROR_LOGS') {
      fetchErrorLogs();
    } else if (activeTab === 'FINANCIAL') {
      fetchTransactions();
      fetchLoyaltyData();
    } else if (activeTab === 'LOYALTY_PROGRAM' || activeTab === 'MEMBERS_DATABASE') {
      fetchLoyaltyData();
    }
  }, [activeTab, trxFilter]);

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs');
      const json = await res.json();
      if (json.success && json.data) {
        setAuditLogs(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    }
  };

  const fetchErrorLogs = async () => {
    try {
      const res = await fetch('/api/admin/error-logs');
      const json = await res.json();
      if (json.success && json.data) {
        setErrorLogs(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch error logs', err);
    }
  };

  async function fetchLoyaltyData() {
    try {
      const [rRes, pRes, mRes] = await Promise.all([
        fetch('/api/admin/loyalty/rewards'),
        fetch('/api/admin/loyalty/pos-transactions'),
        fetch('/api/admin/loyalty/mutations')
      ]);
      
      if (rRes.ok) { const j = await rRes.json(); setRewardsCatalog(j.data || []); }
      if (pRes.ok) { const j = await pRes.json(); setPosTransactions(j.data || []); }
      if (mRes.ok) { const j = await mRes.json(); setPointMutations(j.data || []); }
    } catch(e) {
      console.log('Loyalty API error', e);
    }
  }

  async function deleteReward(id: string) {
    if (!confirm('Hapus reward ini?')) return;
    try {
      const res = await fetch(`/api/admin/loyalty/rewards/${id}`, { method: 'DELETE' });
      if (res.ok) fetchLoyaltyData();
    } catch(e) {
      console.error('Delete error', e);
    }
  }

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
    
    // Jika role WAHANA tapi wahana_id kosong, gunakan wahana pertama yang ada
    let assignedWahanaId = newSysUser.wahana_id;
    if (newSysUser.role === 'WAHANA' && !assignedWahanaId && wahanas.length > 0) {
      assignedWahanaId = wahanas[0].id;
    }

    const res = await fetch('/api/admin/system_users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: newSysUser.username,
        password: newSysUser.password,
        role: newSysUser.role,
        wahana_id: assignedWahanaId || null
      })
    });
    
    if (!res.ok) {
      const data = await res.json();
      toast.error('Gagal: ' + (data.error || 'Terjadi kesalahan'));
      return;
    } else {
      setNewSysUser({ username: '', password: '', role: 'GATE', wahana_id: '' });
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
    const res = await fetch('/api/public/packages?category=MEMBERSHIP');
    const json = await res.json();
    if (json.data) setPackages(json.data);
  }

  async function fetchBundles() {
    const res = await fetch('/api/public/packages?category=TOPUP_BUNDLE');
    const json = await res.json();
    if (json.data) setBundles(json.data);
  }

  async function fetchData() {
    try {
      const [resM, vRes, resW] = await Promise.all([
        fetch('/api/admin/members'),
        fetch('/api/admin/visits'),
        fetch('/api/admin/wahanas')
      ]);
      fetchPackages();
      fetchBundles();
      fetchTransactions();
      fetchLoyaltyData();
      
      const jsonM = await resM.json(); 
      const jsonW = await resW.json();
      
      if (Array.isArray(jsonW)) setWahanas(jsonW);
      else if (jsonW.data) setWahanas(jsonW.data);
      
      const membersData = jsonM.data;
      if (membersData) {
        const primaries = membersData.filter((m: any) => m.role === 'PRIMARY');
        const dependents = membersData.filter((m: any) => m.role !== 'PRIMARY');
        
        let groupedUsers: any[] = [];
        
        primaries.forEach((p: any) => {
          groupedUsers.push(p);
          const related = dependents.filter((d: any) => d.group_id === p.group_id);
          groupedUsers.push(...related);
        });
        
        const orphaned = dependents.filter((d: any) => !primaries.find((p: any) => p.group_id === d.group_id));
        groupedUsers.push(...orphaned);
        
        setUsers(groupedUsers);
      }

      const vJson = await vRes.json();
      if (vJson.data) setRawVisits(vJson.data);
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }

  const addPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPkg.name || !newPkg.price) return;
    
    try {
      const endpoint = editingPkgId ? '/api/admin/packages/update' : '/api/admin/packages/create';
      const method = editingPkgId ? 'PUT' : 'POST';
      
      const payload: any = {
        name: newPkg.name,
        min_qty: newPkg.min_qty,
        max_qty: newPkg.max_qty,
        price: newPkg.price,
        selected_wahanas: newPkg.selected_wahanas
      };
      
      if (editingPkgId) {
        payload.id = editingPkgId;
      }
      
      payload.category = 'MEMBERSHIP';
      
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (!res.ok || data.error) {
        toast.error(`Gagal ${editingPkgId ? 'mengedit' : 'menambah'} paket: ` + (data.error || 'Unknown error'));
      } else {
        setNewPkg({ name: '', min_qty: 1, max_qty: 1, price: '', selected_wahanas: [] });
        setEditingPkgId(null);
        toast.success(`Paket berhasil ${editingPkgId ? 'diedit' : 'ditambahkan'}!`);
        fetchPackages();
      }
    } catch (err: any) {
      toast.error('Gagal menambah paket: ' + err.message);
    }
  };

  const addBundle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBundle.name || !newBundle.price) return;
    try {
      const endpoint = editingBundleId ? '/api/admin/packages/update' : '/api/admin/packages/create';
      const method = editingBundleId ? 'PUT' : 'POST';
      const payload: any = {
        name: newBundle.name,
        min_qty: 1,
        max_qty: 1,
        price: newBundle.price,
        selected_wahanas: newBundle.selected_wahanas,
        category: 'TOPUP_BUNDLE'
      };
      if (editingBundleId) payload.id = editingBundleId;
      const res = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(`Gagal ${editingBundleId ? 'mengedit' : 'menambah'} paket: ` + (data.error || 'Unknown error'));
      } else {
        setNewBundle({ name: '', price: '', selected_wahanas: [] });
        setEditingBundleId(null);
        toast.success(`Paket Bundling berhasil ${editingBundleId ? 'diedit' : 'ditambahkan'}!`);
        fetchBundles();
      }
    } catch (err: any) {
      toast.error('Gagal menyimpan paket: ' + err.message);
    }
  };

  const deleteBundle = async (id: string) => {
    if (!confirm('Hapus paket bundling ini?')) return;
    try {
      const res = await fetch(`/api/admin/packages/delete?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error('Gagal menghapus: ' + (data.error || 'Unknown error'));
      } else {
        fetchBundles();
        toast.success('Paket Bundling dihapus.');
      }
    } catch (err: any) {
      toast.error('Gagal menghapus: ' + err.message);
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

  // --- Analytics Calculations ---
  const memberTotals: Record<string, number> = {};
  let totalRevenue = 0;
  
  // 1. Akumulasi dari transaksi POS Kasir (F&B / Wahana Offline)
  posTransactions.forEach(t => {
    const amount = Number(t.amount) || 0;
    if (!memberTotals[t.member_id]) memberTotals[t.member_id] = 0;
    memberTotals[t.member_id] += amount;
    totalRevenue += amount;
  });

  // 2. Akumulasi dari transaksi Top-Up Wahana / Bundling Online Duitku yang berhasil
  transactions.filter(t => (t.status === 'SUCCESS' || t.status === 'PAID') && (t.package_id?.startsWith('WAHANA_TOPUP') || t.package_id?.startsWith('BUNDLE_TOPUP'))).forEach(t => {
    const amount = Number(t.amount) || 0;
    if (t.member_id) {
      if (!memberTotals[t.member_id]) memberTotals[t.member_id] = 0;
      memberTotals[t.member_id] += amount;
    }
  });

  const uniqueMembersCount = Object.keys(memberTotals).length;
  const topSpendersCount = Object.values(memberTotals).filter(v => (v as number) > 1000000).length;
  const ltv = uniqueMembersCount > 0 ? totalRevenue / uniqueMembersCount : 0;

  const uniqueVisitorIds = new Set();
  const repeatVisitorIds = new Set();
  rawVisits.forEach(v => {
    if (v.member_id) {
      if (uniqueVisitorIds.has(v.member_id)) repeatVisitorIds.add(v.member_id);
      else uniqueVisitorIds.add(v.member_id);
    }
  });
  const retentionRate = uniqueVisitorIds.size > 0 ? ((repeatVisitorIds.size / uniqueVisitorIds.size) * 100).toFixed(1) : '0';

  const peakHoursMap: Record<string, number> = {};
  rawVisits.forEach(v => {
    if(!v.visited_at) return;
    const hour = new Date(v.visited_at).getHours();
    const hourStr = `${hour.toString().padStart(2, '0')}:00`;
    peakHoursMap[hourStr] = (peakHoursMap[hourStr] || 0) + 1;
  });
  const peakHoursData = Object.keys(peakHoursMap).sort().map(h => ({ time: h, visits: peakHoursMap[h] }));

  const revenueLocationMap: Record<string, number> = {};
  posTransactions.forEach(t => {
    let loc = t.location || 'Lainnya';
    if (loc === 'RESTO' || loc === 'F&B Restaurant') loc = 'F&B (Resto)';
    else if (loc === 'SOUVENIR') loc = 'Souvenir';
    else if (loc === 'WAHANA') loc = 'Wahana';
    revenueLocationMap[loc] = (revenueLocationMap[loc] || 0) + Number(t.amount);
  });
  const revenueLocationData = Object.keys(revenueLocationMap).map(loc => ({ name: loc, value: revenueLocationMap[loc] })).sort((a,b) => b.value - a.value);
  
  const provinceMap: Record<string, number> = {};
  const ageGroupMap: Record<string, number> = { '<20': 0, '21-35': 0, '36-50': 0, '>50': 0 };

  users.forEach(u => {
    const demo = extractDemographics(u.nik);
    if (demo.province && demo.province !== 'Unknown' && demo.province !== 'Lainnya') {
      provinceMap[demo.province] = (provinceMap[demo.province] || 0) + 1;
    }
    if (typeof demo.age === 'number' && !isNaN(demo.age)) {
      if (demo.age < 20) ageGroupMap['<20']++;
      else if (demo.age <= 35) ageGroupMap['21-35']++;
      else if (demo.age <= 50) ageGroupMap['36-50']++;
      else ageGroupMap['>50']++;
    }
  });

  const provinceData = Object.keys(provinceMap).map(name => ({ name, value: provinceMap[name] })).sort((a, b) => b.value - a.value).slice(0, 5);
  const ageGroupData = Object.keys(ageGroupMap).map(name => ({ name, value: ageGroupMap[name] }));

  const PIE_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#06b6d4'];

  // --- FINANCIAL REPORT CALCULATIONS ---
  let filteredTransactions = transactions;
  let filteredPosTransactions = posTransactions;

  const finNow = new Date();
  if (financeFilter === 'TODAY') {
    finNow.setHours(0, 0, 0, 0);
    filteredTransactions = transactions.filter(t => new Date(t.created_at) >= finNow);
    filteredPosTransactions = posTransactions.filter(t => new Date(t.created_at) >= finNow);
  } else if (financeFilter === 'MONTH') {
    const monthAgo = new Date(finNow.getFullYear(), finNow.getMonth(), 1);
    filteredTransactions = transactions.filter(t => new Date(t.created_at) >= monthAgo);
    filteredPosTransactions = posTransactions.filter(t => new Date(t.created_at) >= monthAgo);
  } else if (financeFilter === 'YEAR') {
    const yearAgo = new Date(finNow.getFullYear(), 0, 1);
    filteredTransactions = transactions.filter(t => new Date(t.created_at) >= yearAgo);
    filteredPosTransactions = posTransactions.filter(t => new Date(t.created_at) >= yearAgo);
  } else if (financeFilter === 'CUSTOM' && financeCustomDate) {
    const customStart = new Date(financeCustomDate);
    customStart.setHours(0, 0, 0, 0);
    const customEnd = new Date(customStart);
    customEnd.setDate(customEnd.getDate() + 1);
    filteredTransactions = transactions.filter(t => {
      const d = new Date(t.created_at);
      return d >= customStart && d < customEnd;
    });
    filteredPosTransactions = posTransactions.filter(t => {
      const d = new Date(t.created_at);
      return d >= customStart && d < customEnd;
    });
  }

  let totalTicketRevenue = 0;
  let totalPosRevenue = 0;

  filteredTransactions.forEach((tx: any) => {
    const isPaid = !tx.payment_status || ['PAID', 'SUCCESS', 'COMPLETED'].includes(tx.payment_status) || ['PAID', 'SUCCESS', 'COMPLETED'].includes(tx.status);
    if (isPaid) {
      totalTicketRevenue += Number(tx.amount || tx.total_amount || 0);
    }
  });

  let restoRevenue = 0;
  let souvenirRevenue = 0;
  let ridesRevenue = 0;
  
  const terminalRevenueMap: Record<string, number> = {};

  filteredPosTransactions.forEach((tx: any) => {
    const amt = Number(tx.amount || 0);
    totalPosRevenue += amt;
    if (tx.location === 'RESTO') restoRevenue += amt;
    else if (tx.location === 'SOUVENIR') souvenirRevenue += amt;
    else ridesRevenue += amt;
    
    let tName = tx.terminal_name || tx.location || 'Terminal Tidak Diketahui';
    if (tName === 'RESTO') tName = 'F&B (Lainnya)';
    else if (tName === 'SOUVENIR') tName = 'Souvenir (Lainnya)';
    else if (tName === 'WAHANA') tName = 'Wahana (Lainnya)';
    
    terminalRevenueMap[tName] = (terminalRevenueMap[tName] || 0) + amt;
  });
  
  const terminalRevenueData = Object.keys(terminalRevenueMap)
    .map(k => ({ name: k, value: terminalRevenueMap[k] }))
    .sort((a, b) => b.value - a.value);

  const financialTotalRevenue = totalTicketRevenue + totalPosRevenue;

  const revenueCompositionData = [
    { name: 'Tiket Masuk', value: totalTicketRevenue },
    { name: 'F&B (Resto)', value: restoRevenue },
    { name: 'Souvenir', value: souvenirRevenue },
    { name: 'Wahana', value: ridesRevenue },
  ].filter(d => d.value > 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let trendData: any[] = [];

  if (financeFilter === 'TODAY' || (financeFilter === 'CUSTOM' && financeCustomDate)) {
    const baseDate = financeFilter === 'TODAY' ? new Date() : new Date(financeCustomDate);
    baseDate.setHours(0, 0, 0, 0);
    
    trendData = Array.from({length: 12}).map((_, i) => {
      const hourStart = i * 2;
      const hourEnd = hourStart + 2;
      
      let dTicket = 0;
      let dPos = 0;
      
      filteredTransactions.forEach((tx: any) => {
        const isPaid = !tx.payment_status || ['PAID', 'SUCCESS', 'COMPLETED'].includes(tx.payment_status) || ['PAID', 'SUCCESS', 'COMPLETED'].includes(tx.status);
        if (isPaid) {
          const txDate = new Date(tx.created_at);
          if (txDate.getHours() >= hourStart && txDate.getHours() < hourEnd) dTicket += Number(tx.amount || tx.total_amount || 0);
        }
      });
      filteredPosTransactions.forEach((tx: any) => {
        const txDate = new Date(tx.created_at);
        if (txDate.getHours() >= hourStart && txDate.getHours() < hourEnd) dPos += Number(tx.amount || 0);
      });
      
      return {
        date: `${hourStart.toString().padStart(2, '0')}:00`,
        Tiket: dTicket,
        'F&B / Retail': dPos
      };
    });
  } else {
    const points = financeFilter === 'MONTH' ? 14 : (financeFilter === 'YEAR' || financeFilter === 'ALL' ? 12 : 7);
    
    trendData = Array.from({length: points}).map((_, i) => {
      const d = new Date(today);
      if (points === 12) {
        d.setMonth(d.getMonth() - (11 - i));
        d.setDate(1);
        const nextMonth = new Date(d);
        nextMonth.setMonth(d.getMonth() + 1);
        
        let dTicket = 0;
        let dPos = 0;
        filteredTransactions.forEach((tx: any) => {
          const isPaid = !tx.payment_status || ['PAID', 'SUCCESS', 'COMPLETED'].includes(tx.payment_status) || ['PAID', 'SUCCESS', 'COMPLETED'].includes(tx.status);
          if (isPaid) {
            const txDate = new Date(tx.created_at);
            if (txDate >= d && txDate < nextMonth) dTicket += Number(tx.amount || tx.total_amount || 0);
          }
        });
        filteredPosTransactions.forEach((tx: any) => {
          const txDate = new Date(tx.created_at);
          if (txDate >= d && txDate < nextMonth) dPos += Number(tx.amount || 0);
        });
        return { date: d.toLocaleDateString('id-ID', { month: 'short' }), Tiket: dTicket, 'F&B / Retail': dPos };
      } else {
        d.setDate(d.getDate() - ((points - 1) - i));
        const nextDay = new Date(d);
        nextDay.setDate(d.getDate() + 1);
        
        let dTicket = 0;
        let dPos = 0;
        filteredTransactions.forEach((tx: any) => {
          const isPaid = !tx.payment_status || ['PAID', 'SUCCESS', 'COMPLETED'].includes(tx.payment_status) || ['PAID', 'SUCCESS', 'COMPLETED'].includes(tx.status);
          if (isPaid) {
            const txDate = new Date(tx.created_at);
            if (txDate >= d && txDate < nextDay) dTicket += Number(tx.amount || tx.total_amount || 0);
          }
        });
        filteredPosTransactions.forEach((tx: any) => {
          const txDate = new Date(tx.created_at);
          if (txDate >= d && txDate < nextDay) dPos += Number(tx.amount || 0);
        });
        return { date: d.toLocaleDateString('id-ID', { weekday: 'short', day: points > 7 ? 'numeric' : undefined }), Tiket: dTicket, 'F&B / Retail': dPos };
      }
    });
  }

  const allRecentTransactions = [
    ...filteredTransactions.map((t: any) => ({
      id: t.id,
      date: new Date(t.created_at),
      type: 'Tiket',
      amount: Number(t.amount || t.total_amount || 0),
      status: t.payment_status || t.status || 'PAID'
    })),
    ...filteredPosTransactions.map((t: any) => ({
      id: t.id,
      date: new Date(t.created_at),
      type: t.location === 'RESTO' ? 'F&B' : (t.location === 'SOUVENIR' ? 'Souvenir' : 'Wahana'),
      amount: Number(t.amount || 0),
      status: 'PAID'
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);

  const handleExportCSV = () => {
    const headers = ['Nama', 'NIK', 'Tipe', 'Email', 'Telepon', 'Status', 'Masa Aktif', 'Kunjungan', 'Total Belanja', 'Kategori CRM', 'Usia', 'Jenis Kelamin', 'Asal Daerah'];
    const csvRows = [headers.join(';')];

    users.forEach(u => {
      const visitsCount = rawVisits.filter(v => v.member_id === u.id || (u.role === 'PRIMARY' && v.member_id === u.group_id)).length;
      const totalSpend = memberTotals[u.id] || 0;
      
      const userVisits = rawVisits.filter(v => v.member_id === u.id || (u.role === 'PRIMARY' && v.member_id === u.group_id))
                                  .sort((a,b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime());
      const lastVisit = userVisits.length > 0 ? userVisits[0].visited_at : null;

      const rfm = getRFMTag(visitsCount, totalSpend, lastVisit);
      const demo = extractDemographics(u.nik);

      const row = [
        `"${u.name}"`,
        `'${u.nik}'`,
        `"${u.role}"`,
        `"${u.email || ''}"`,
        `'${u.phone || ''}'`,
        `"${u.status}"`,
        `"${u.activation_date ? new Date(u.activation_date).toLocaleDateString('id-ID') : '-'}"`,
        visitsCount,
        totalSpend,
        `"${rfm.label}"`,
        demo.age,
        `"${demo.gender}"`,
        `"${demo.province}"`
      ];
      csvRows.push(row.join(';'));
    });

    const csvData = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const csvUrl = URL.createObjectURL(csvData);
    const hiddenElement = document.createElement('a');
    hiddenElement.href = csvUrl;
    hiddenElement.target = '_blank';
    hiddenElement.download = `Laporan_CRM_Aviary_${new Date().toLocaleDateString('id-ID')}.csv`;
    hiddenElement.click();
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
        position: 'relative', zIndex: 1, width: isSidebarOpen ? '300px' : '0px', overflow: 'hidden',
        backgroundColor: '#022c22', display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0,0,0,0.05)', transition: 'width 0.3s ease'
      }}>
        {/* Plant Motif Pattern Overlay */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: `url('/aviary_pattern.png') left top / cover`,
          opacity: 0.1, pointerEvents: 'none', zIndex: 0
        }}></div>
        
        <div style={{ position: 'relative', zIndex: 1, width: '300px', padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '100%', opacity: isSidebarOpen ? 1 : 0, transition: 'opacity 0.3s ease' }}>
          
          {/* Hanging Logo Tab */}
          <div style={{ 
              position: 'relative', padding: '1rem 2rem 1.5rem 2rem',
              marginBottom: '2rem', marginTop: '-1.25rem', alignSelf: 'center', 
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

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, overflowY: 'auto', whiteSpace: 'nowrap' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.2rem', paddingLeft: '0.5rem', marginTop: '0.75rem' }}>LAPORAN & ANALITIK</p>
            <div onClick={() => setActiveTab('DASHBOARD')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', backgroundColor: activeTab === 'DASHBOARD' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'DASHBOARD' ? '#ffffff' : '#94a3b8', borderRadius: '0.5rem', fontWeight: activeTab === 'DASHBOARD' ? '600' : '400', cursor: 'pointer', borderLeft: activeTab === 'DASHBOARD' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s', fontSize: '0.9rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span>Dashboard</span>
            </div>
            <div onClick={() => setActiveTab('FINANCIAL')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', backgroundColor: activeTab === 'FINANCIAL' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'FINANCIAL' ? '#ffffff' : '#94a3b8', borderRadius: '0.5rem', fontWeight: activeTab === 'FINANCIAL' ? '600' : '400', cursor: 'pointer', borderLeft: activeTab === 'FINANCIAL' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s', fontSize: '0.9rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              <span>Laporan Keuangan</span>
            </div>
            <div onClick={() => setActiveTab('REPORTS')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', backgroundColor: activeTab === 'REPORTS' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'REPORTS' ? '#ffffff' : '#94a3b8', borderRadius: '0.5rem', fontWeight: activeTab === 'REPORTS' ? '600' : '400', cursor: 'pointer', borderLeft: activeTab === 'REPORTS' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s', fontSize: '0.9rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
              <span>Laporan Anti-Fraud</span>
            </div>

            <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.2rem', paddingLeft: '0.5rem', marginTop: '0.75rem' }}>OPERASIONAL HARIAN</p>
            <div onClick={() => setActiveTab('SCHEDULES')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', backgroundColor: activeTab === 'SCHEDULES' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'SCHEDULES' ? '#ffffff' : '#94a3b8', borderRadius: '0.5rem', fontWeight: activeTab === 'SCHEDULES' ? '600' : '400', cursor: 'pointer', borderLeft: activeTab === 'SCHEDULES' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s', fontSize: '0.9rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>Jadwal Aktivitas</span>
            </div>
            <div onClick={() => setActiveTab('EVENTS')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', backgroundColor: activeTab === 'EVENTS' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'EVENTS' ? '#ffffff' : '#94a3b8', borderRadius: '0.5rem', fontWeight: activeTab === 'EVENTS' ? '600' : '400', cursor: 'pointer', borderLeft: activeTab === 'EVENTS' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s', fontSize: '0.9rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Event & Pengumuman</span>
            </div>

            <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.2rem', paddingLeft: '0.5rem', marginTop: '0.75rem' }}>MANAJEMEN PENGUNJUNG</p>
            <div onClick={() => setActiveTab('MEMBERS_DATABASE')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', backgroundColor: activeTab === 'MEMBERS_DATABASE' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'MEMBERS_DATABASE' ? '#ffffff' : '#94a3b8', borderRadius: '0.5rem', fontWeight: activeTab === 'MEMBERS_DATABASE' ? '600' : '400', cursor: 'pointer', borderLeft: activeTab === 'MEMBERS_DATABASE' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s', fontSize: '0.9rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>Database Member</span>
            </div>

            <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.2rem', paddingLeft: '0.5rem', marginTop: '0.75rem' }}>PENGATURAN SISTEM</p>
            <div onClick={() => setActiveTab('TICKET_PACKAGES')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', backgroundColor: activeTab === 'TICKET_PACKAGES' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'TICKET_PACKAGES' ? '#ffffff' : '#94a3b8', borderRadius: '0.5rem', fontWeight: activeTab === 'TICKET_PACKAGES' ? '600' : '400', cursor: 'pointer', borderLeft: activeTab === 'TICKET_PACKAGES' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s', fontSize: '0.9rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              <span>Paket Tiket</span>
            </div>
            <div onClick={() => setActiveTab('SYSTEM_USERS')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', backgroundColor: activeTab === 'SYSTEM_USERS' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'SYSTEM_USERS' ? '#ffffff' : '#94a3b8', borderRadius: '0.5rem', fontWeight: activeTab === 'SYSTEM_USERS' ? '600' : '400', cursor: 'pointer', borderLeft: activeTab === 'SYSTEM_USERS' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s', fontSize: '0.9rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
              <span>User Admin</span>
            </div>
            <div onClick={() => setActiveTab('MASTER_WAHANA')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', backgroundColor: activeTab === 'MASTER_WAHANA' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'MASTER_WAHANA' ? '#ffffff' : '#94a3b8', borderRadius: '0.5rem', fontWeight: activeTab === 'MASTER_WAHANA' ? '600' : '400', cursor: 'pointer', borderLeft: activeTab === 'MASTER_WAHANA' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s', fontSize: '0.9rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
              <span>Master Wahana</span>
            </div>
            <Link href="/gate-wahana" target="_blank" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', color: '#34d399', textDecoration: 'none', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.9rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', marginTop: '0.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M4 7V4h16v3M4 17v3h16v-3M9 12h6"/></svg>
              <span>Buka Scanner Wahana ↗</span>
            </Link>

            <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.2rem', paddingLeft: '0.5rem', marginTop: '0.75rem' }}>LOG & MONITORING</p>
            <div onClick={() => setActiveTab('AUDIT_LOGS')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', backgroundColor: activeTab === 'AUDIT_LOGS' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'AUDIT_LOGS' ? '#ffffff' : '#94a3b8', borderRadius: '0.5rem', fontWeight: activeTab === 'AUDIT_LOGS' ? '600' : '400', cursor: 'pointer', borderLeft: activeTab === 'AUDIT_LOGS' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s', fontSize: '0.9rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              <span>Log Aktivitas</span>
            </div>
            <div onClick={() => setActiveTab('ERROR_LOGS')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', backgroundColor: activeTab === 'ERROR_LOGS' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'ERROR_LOGS' ? '#ffffff' : '#ef4444', borderRadius: '0.5rem', fontWeight: activeTab === 'ERROR_LOGS' ? '600' : '400', cursor: 'pointer', borderLeft: activeTab === 'ERROR_LOGS' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s', fontSize: '0.9rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>Log Error System</span>
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
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#f8fafc', position: 'relative' }}>
        
        {/* TOPBAR */}
        <header style={{ 
          backgroundColor: 'white', padding: '1rem 2rem', 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
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

          {/* Weather / Holiday Indicator */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
            <div style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '1rem',
              backgroundColor: dashboardStats.todayHoliday ? '#fef3c7' : (dashboardStats.isWeekend ? '#dbeafe' : '#f0fdf4'),
              border: `1px solid ${dashboardStats.todayHoliday ? '#f59e0b' : (dashboardStats.isWeekend ? '#3b82f6' : '#10b981')}`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '1.25rem' }}>
                {dashboardStats.todayHoliday ? '' : (dashboardStats.isWeekend ? '' : '')}
              </span>
              <span style={{
                fontWeight: '600',
                fontSize: '0.875rem',
                color: dashboardStats.todayHoliday ? '#92400e' : (dashboardStats.isWeekend ? '#1e40af' : '#065f46')
              }}>
                {dashboardStats.todayHoliday
                  ? `${dashboardStats.todayHoliday.name} - Potensi Kunjungan Tinggi!`
                  : (dashboardStats.isWeekend
                    ? 'Akhir Pekan - Perkiraan Pengunjung Meningkat'
                    : 'Hari Biasa - Operasional Normal')}
              </span>
            </div>
          </div>

          {/* Peringatan Membership Banner (Muncul Jika Ada Expired) */}
          {(dashboardStats.expiredMembers > 0 || dashboardStats.soonExpiring > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {dashboardStats.expiredMembers > 0 && (
                <div style={{ padding: '0.75rem 1.25rem', borderRadius: '0.75rem', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', color: '#b91c1c', fontSize: '0.875rem' }}>Terdapat {dashboardStats.expiredMembers} membership yang telah expired.</span>
                </div>
              )}
              {dashboardStats.soonExpiring > 0 && (
                <div style={{ padding: '0.75rem 1.25rem', borderRadius: '0.75rem', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', color: '#b45309', fontSize: '0.875rem' }}>{dashboardStats.soonExpiring} membership akan segera expire dalam 30 hari ke depan.</span>
                </div>
              )}
            </div>
          )}

          {/* Row 1: Main Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>

            {/* Card 1: Total Member */}
            <div style={{ backgroundColor: 'white', borderRadius: '1.25rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', padding: '1rem', position: 'relative', overflow: 'hidden', borderTop: '4px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 0.5rem 0', fontWeight: '600' }}>Total Member</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: '800', color: '#059669', margin: 0, lineHeight: 1 }}>{users.length}</p>
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '0.5rem 0 0 0' }}>terdaftar di sistem</p>
                </div>
                <div style={{ backgroundColor: '#ecfdf5', padding: '0.75rem', borderRadius: '0.75rem' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
              </div>
            </div>

            {/* Card 2: Total Kunjungan */}
            <div style={{ backgroundColor: 'white', borderRadius: '1.25rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', padding: '1rem', position: 'relative', overflow: 'hidden', borderTop: '4px solid #3b82f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 0.5rem 0', fontWeight: '600' }}>Total Kunjungan</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: '800', color: '#3b82f6', margin: 0, lineHeight: 1 }}>
                    {visitsData.reduce((acc, curr) => acc + curr.Kunjungan, 0)}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '0.5rem 0 0 0' }}>
                   Hari ini: {visitsData[visitsData.length - 1]?.Kunjungan || 0}x
                  </p>
                </div>
                <div style={{ backgroundColor: '#eff6ff', padding: '0.75rem', borderRadius: '0.75rem' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>
                </div>
              </div>
            </div>

            {/* Card 3: Revenue Today */}
            <div style={{ backgroundColor: 'white', borderRadius: '1.25rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', padding: '1rem', position: 'relative', overflow: 'hidden', borderTop: '4px solid #8b5cf6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 0.5rem 0', fontWeight: '600' }}>Pendapatan Hari Ini</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: '800', color: '#7c3aed', margin: 0, lineHeight: 1 }}>
                    Rp {dashboardStats.revenueToday.toLocaleString('id-ID')}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: dashboardStats.revenueGrowth >= 0 ? '#059669' : '#ef4444', margin: '0.5rem 0 0 0', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {dashboardStats.revenueGrowth >= 0 ? '+' : ''}{dashboardStats.revenueGrowth.toFixed(1)}% vs kemarin
                  </p>
                </div>
                <div style={{ backgroundColor: '#f5f3ff', padding: '0.75rem', borderRadius: '0.75rem' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
              </div>
            </div>

            {/* Card 4: Conversion Rate */}
            <div style={{ backgroundColor: 'white', borderRadius: '1.25rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', padding: '1rem', position: 'relative', overflow: 'hidden', borderTop: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 0.5rem 0', fontWeight: '600' }}>Conversion Rate</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: '800', color: '#d97706', margin: 0, lineHeight: 1 }}>
                    {dashboardStats.conversionRate.toFixed(0)}%
                  </p>
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '0.5rem 0 0 0' }}>
                    {dashboardStats.successfulTransactions} paid / {dashboardStats.pendingTransactions} pending
                  </p>
                </div>
                <div style={{ backgroundColor: '#fef3c7', padding: '0.75rem', borderRadius: '0.75rem' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Paket & Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>

            {/* Card 6: Top Performing Package */}
            <div style={{ backgroundColor: 'white', borderRadius: '1.25rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, fontWeight: '600' }}>Paket Terlaris</p>
                </div>
                <span style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '700' }}>
                  Top Package
                </span>
              </div>

              {dashboardStats.topPackage ? (
                <div>
                  <div style={{ backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '0.75rem', textAlign: 'center', marginBottom: '0.75rem' }}>
                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#065f46' }}>
                      {dashboardStats.topPackage.name}
                    </p>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: '800', color: '#059669' }}>
                      {dashboardStats.topPackage.revenue >= 1000000 ? `Rp ${(dashboardStats.topPackage.revenue / 1000000).toFixed(1)} Jt` : `Rp ${dashboardStats.topPackage.revenue.toLocaleString('id-ID')}`}
                    </p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                      {dashboardStats.topPackage.count} transaksi
                    </p>
                  </div>
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', margin: '1rem 0', fontStyle: 'italic' }}>
                  Belum ada data penjualan
                </p>
              )}
            </div>

            {/* Card 7: Quick Stats */}
            <div style={{ backgroundColor: 'white', borderRadius: '1.25rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 1rem 0', fontWeight: '600' }}>Statistik Cepat</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Transaksi</span>
                  <span style={{ fontWeight: '700', color: '#334155' }}>{dashboardStats.totalTransactions}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Pending</span>
                  <span style={{ fontWeight: '700', color: '#f59e0b' }}>{dashboardStats.pendingTransactions}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Success</span>
                  <span style={{ fontWeight: '700', color: '#10b981' }}>{dashboardStats.successfulTransactions}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Kemarin Revenue</span>
                  <span style={{ fontWeight: '700', color: '#334155' }}>{dashboardStats.revenueYesterday >= 1000000 ? `Rp ${(dashboardStats.revenueYesterday / 1000000).toFixed(1)} Jt` : `Rp ${dashboardStats.revenueYesterday.toLocaleString('id-ID')}`}</span>
                </div>
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
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={handleExportCSV} style={{ padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Unduh Laporan CSV
              </button>
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
                    <th style={{ padding: '1rem' }}>Segmen CRM & Demografi</th>
                    <th style={{ padding: '1rem' }}>Visits</th>
                    <th style={{ padding: '1rem' }}>F&B / Wahana</th>
                    <th style={{ padding: '1rem' }}>Voucher Aktif</th>
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
                        <tr key={u.id || i} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: u.role === 'PRIMARY' ? 'white' : '#f8fafc', transition: 'background-color 0.2s' }}>
                          <td style={{ padding: '1rem', fontWeight: u.role === 'PRIMARY' ? '600' : 'normal', color: '#0f172a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: u.role === 'PRIMARY' ? '0' : '1.25rem' }}>
                              <span>{u.name}</span>
                              {u.role === 'PRIMARY' && (
                                <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '0.15rem 0.4rem', backgroundColor: '#e0e7ff', color: '#3730a3', borderRadius: '0.25rem', textTransform: 'uppercase' }}>
                                  Utama
                                </span>
                              )}
                              
                              {u.role === 'PRIMARY' && dependentsCount > 0 && (
                                <button 
                                  onClick={() => toggleGroup(u.group_id)}
                                  style={{ 
                                    marginLeft: '0.25rem', padding: '0.2rem 0.5rem', fontSize: '0.7rem', 
                                    backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '0.25rem', 
                                    cursor: 'pointer', color: '#475569', fontWeight: '600'
                                  }}
                                >
                                  {expandedGroups[u.group_id] ? 'Tutup' : `+${dependentsCount} Keluarga`}
                                </button>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '1rem', color: '#475569', fontSize: '0.85rem' }}>
                            {u.nik && u.nik.length === 16 
                              ? `${u.nik.substring(0, 6)}******${u.nik.substring(12)}` 
                              : u.nik || '-'}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            {(() => {
                              const vCount = rawVisits.filter(v => v.member_id === u.id || (u.role === 'PRIMARY' && v.member_id === u.group_id)).length;
                              const tSpend = memberTotals[u.id] || 0;
                              const uVisits = rawVisits.filter(v => v.member_id === u.id || (u.role === 'PRIMARY' && v.member_id === u.group_id)).sort((a,b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime());
                              const lVisit = uVisits.length > 0 ? uVisits[0].visited_at : null;
                              const rfm = getRFMTag(vCount, tSpend, lVisit);
                              const demo = extractDemographics(u.nik);
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <span style={{ backgroundColor: rfm.bg, color: rfm.color, padding: '0.15rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '600', width: 'fit-content' }}>
                                    {rfm.label}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{demo.gender}, {demo.age} thn, {demo.province}</span>
                                </div>
                              );
                            })()}
                          </td>
                          <td style={{ padding: '1rem', fontWeight: '600', color: '#0f172a', fontSize: '0.85rem' }}>
                            {new Set(rawVisits.filter(v => v.member_id === u.id || (u.role === 'PRIMARY' && v.member_id === u.group_id)).map(v => new Date(v.visited_at).toLocaleDateString('id-ID'))).size}x
                          </td>
                          <td style={{ padding: '1rem', color: '#059669', fontWeight: '600', fontSize: '0.85rem' }}>
                            Rp {(memberTotals[u.id] || 0).toLocaleString('id-ID')}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                            <div style={{ fontWeight: '600', color: '#b45309' }}>
                              {u.member_wahana_vouchers?.reduce((sum: number, v: any) => sum + (v.quota || 0), 0) || 0} Tiket
                            </div>
                            {u.member_wahana_vouchers && u.member_wahana_vouchers.filter((v: any) => v.quota > 0).length > 0 && (
                              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                {u.member_wahana_vouchers.filter((v: any) => v.quota > 0).map((v: any) => {
                                  const wName = wahanas.find(w => w.id === v.wahana_id)?.name || 'Wahana';
                                  return <div key={v.wahana_id}>{wName}: <strong style={{color:'#d97706'}}>{v.quota}x</strong></div>;
                                })}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                            <div style={{ color: '#334155' }}>{u.email}</div>
                            <div style={{ color: '#059669', fontSize: '0.8rem', marginTop: '0.15rem' }}>{u.phone}</div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ backgroundColor: u.status === 'ACTIVE' ? '#dcfce7' : '#fef3c7', color: u.status === 'ACTIVE' ? '#166534' : '#92400e', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '600' }}>
                              {u.status === 'ACTIVE' ? 'Aktif' : 'Menunggu Bayar'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', color: u.face_descriptor ? '#166534' : '#991b1b', fontWeight: '600', fontSize: '0.8rem' }}>
                            {u.face_descriptor ? 'Terdaftar' : 'Belum Ada'}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#475569' }}>
                            {u.activation_date ? (() => {
                              const date = new Date(u.activation_date);
                              date.setFullYear(date.getFullYear() + 1);
                              return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                            })() : '-'}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button onClick={() => setSelectedMemberDetail(u)} style={{ padding: '0.35rem 0.65rem', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}>Detail</button>
                              <button onClick={() => deleteUser(u.id)} style={{ padding: '0.35rem 0.65rem', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}>Hapus</button>
                            </div>
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
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Upload Gambar (Poster, Maks. 3MB)</label>
                    <input type="file" accept="image/*" onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        if (file.size > 3 * 1024 * 1024) {
                          toast.error('Ukuran poster maksimal 3MB!');
                          e.target.value = '';
                          return;
                        }
                        setImageFile(file);
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
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>Upload Foto (Maks. 3MB)</label>
                    <input type="file" accept="image/*" onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        if (file.size > 3 * 1024 * 1024) {
                          toast.error('Ukuran gambar maksimal 3MB!');
                          e.target.value = '';
                          return;
                        }
                        setScheduleImageFile(file);
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

      {activeTab === 'LOYALTY_PROGRAM' && (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>Loyalty & Rewards Program</h2>
            <button 
              onClick={() => {
                setNewReward({ name: '', description: '', points_required: 100, reward_type: 'VOUCHER_50K', is_active: true });
                setShowRewardForm(true);
              }}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' }}
            >
              + Tambah Reward
            </button>
          </div>

          {/* Catalog List */}
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '2rem' }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>Katalog Reward (Bisa Ditukar Member)</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: '0.875rem' }}>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>Nama Reward</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>Tipe</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>Poin Dibutuhkan</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rewardsCatalog.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Belum ada katalog reward, silakan tambah.</td>
                  </tr>
                ) : rewardsCatalog.map((r, idx) => (
                  <tr key={r.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: '#0f172a' }}>{r.name}</td>
                    <td style={{ padding: '1rem 1.5rem', color: '#334155' }}>{r.reward_type}</td>
                    <td style={{ padding: '1rem 1.5rem', color: '#059669', fontWeight: '600' }}>{r.points_required} Poin</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span 
                        onClick={async () => {
                          if (!r.id) return;
                          await fetch(`/api/admin/loyalty/rewards/${r.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ is_active: !r.is_active })
                          });
                          fetchLoyaltyData();
                        }}
                        style={{ cursor: 'pointer', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: r.is_active ? '#dcfce7' : '#fee2e2', color: r.is_active ? '#166534' : '#991b1b' }}
                      >
                        {r.is_active ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => {
                            setEditingRewardId(r.id);
                            setNewReward({ name: r.name, description: r.description || '', points_required: r.points_required, reward_type: r.reward_type, is_active: r.is_active });
                            setShowRewardForm(true);
                          }}
                          style={{ padding: '0.5rem', backgroundColor: '#e0f2fe', color: '#0284c7', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button 
                          onClick={() => deleteReward(r.id)}
                          style={{ padding: '0.5rem', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
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
          
          {showRewardForm && (
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem' }}>Tambah Reward Baru</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input placeholder="Nama Reward (e.g. Voucher 50K)" value={newReward.name} onChange={e => setNewReward({...newReward, name: e.target.value})} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                <input placeholder="Deskripsi Singkat" value={newReward.description} onChange={e => setNewReward({...newReward, description: e.target.value})} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>Poin Dibutuhkan</label>
                    <input type="number" value={newReward.points_required} onChange={e => setNewReward({...newReward, points_required: Number(e.target.value)})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>Tipe Reward</label>
                    <select value={newReward.reward_type} onChange={e => setNewReward({...newReward, reward_type: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                      <option value="VOUCHER_50K">Voucher Potongan</option>
                      <option value="FREE_RIDE">Gratis Wahana</option>
                      <option value="EXTEND_PASS">Perpanjangan Kartu</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button 
                    onClick={async () => {
                      try {
                        const url = editingRewardId ? `/api/admin/loyalty/rewards/${editingRewardId}` : '/api/admin/loyalty/rewards';
                        const method = editingRewardId ? 'PUT' : 'POST';
                        const res = await fetch(url, {
                          method,
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(newReward)
                        });
                        if (res.ok) {
                          setShowRewardForm(false);
                          setEditingRewardId(null);
                          fetchLoyaltyData();
                        } else {
                          alert('Gagal menyimpan reward');
                        }
                      } catch(e) {
                        alert('Gagal menyimpan reward');
                      }
                    }}
                    style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    {editingRewardId ? 'Update Reward' : 'Simpan Reward'}
                  </button>
                  <button onClick={() => { setShowRewardForm(false); setEditingRewardId(null); }} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' }}>Batal</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}



      {activeTab === 'REPORTS' && (
        <ReportsTab />
      )}

      {activeTab === 'FINANCIAL' && (
      <FinancialReports
        transactions={transactions}
        posTransactions={posTransactions}
        filteredTransactions={filteredTransactions}
        filteredPosTransactions={filteredPosTransactions}
        financialTotalRevenue={financialTotalRevenue}
        totalTicketRevenue={totalTicketRevenue}
        totalPosRevenue={totalPosRevenue}
        revenueCompositionData={revenueCompositionData}
        trendData={trendData}
        terminalRevenueData={terminalRevenueData}
        allRecentTransactions={allRecentTransactions}
        financeFilter={financeFilter}
        setFinanceFilter={setFinanceFilter}
        PIE_COLORS={PIE_COLORS}
        pointMutations={pointMutations}
      />
      )}

      {/* Member Detail Modal */}
      {selectedMemberDetail && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>Detail Profil CRM: {selectedMemberDetail.name}</h2>
              <button onClick={() => setSelectedMemberDetail(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '2rem', color: '#64748b', lineHeight: 1 }}>×</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#334155', borderBottom: '3px solid #8b5cf6', display: 'inline-block', marginBottom: '1rem', paddingBottom: '0.25rem' }}>Riwayat Kunjungan Gerbang</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '400px', overflowY: 'auto' }}>
                  {Object.values(rawVisits.filter(v => v.member_id === selectedMemberDetail.id || (selectedMemberDetail.role === 'PRIMARY' && v.member_id === selectedMemberDetail.group_id))
                    .reduce((acc, curr) => {
                      const dateStr = new Date(curr.visited_at).toLocaleDateString('id-ID');
                      // Simpan hanya kunjungan pertama di hari itu
                      if (!acc[dateStr] || new Date(curr.visited_at) < new Date(acc[dateStr].visited_at)) {
                        acc[dateStr] = curr;
                      }
                      return acc;
                    }, {} as Record<string, any>)).map((v: any, idx: number) => (
                    <li key={idx} style={{ padding: '0.75rem', backgroundColor: 'white', marginBottom: '0.5rem', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <span style={{ fontWeight: '500', color: '#1e293b' }}>{new Date(v.visited_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{new Date(v.visited_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </li>
                  ))}
                  {rawVisits.filter(v => v.member_id === selectedMemberDetail.id || (selectedMemberDetail.role === 'PRIMARY' && v.member_id === selectedMemberDetail.group_id)).length === 0 && (
                    <p style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic' }}>Belum ada rekaman kunjungan.</p>
                  )}
                </ul>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#334155', borderBottom: '3px solid #10b981', display: 'inline-block', marginBottom: '1rem', paddingBottom: '0.25rem' }}>Riwayat Belanja (POS)</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '400px', overflowY: 'auto' }}>
                  {posTransactions.filter(t => t.member_id === selectedMemberDetail.id).map((t, idx) => (
                    <li key={idx} style={{ padding: '0.75rem', backgroundColor: 'white', marginBottom: '0.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 'bold', color: '#059669' }}>Rp {Number(t.amount).toLocaleString('id-ID')}</span>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{new Date(t.created_at).toLocaleDateString('id-ID')}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569' }}>Lokasi Kasir: <span style={{ fontWeight: '500' }}>{t.location}</span></div>
                    </li>
                  ))}
                  {posTransactions.filter(t => t.member_id === selectedMemberDetail.id).length === 0 && (
                    <p style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic' }}>Belum ada rekaman pembelanjaan.</p>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

        {activeTab === 'MASTER_WAHANA' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <MasterWahanaTab />
            
            <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
              <h3 style={{ marginBottom: '0.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>🎟️ Paket Bundling Top-Up Wahana</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>Paket ini dijual di POS Kasir saat pengunjung ingin top-up tiket. 1 pembelian = dapat voucher beberapa wahana sekaligus dengan harga lebih hemat.</p>
              
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 300px' }}>
                  <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {editingBundleId ? 'Edit Paket Bundling' : 'Tambah Paket Bundling'}
                  </h4>
                  <form onSubmit={addBundle} style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Nama Paket</label>
                      <input type="text" required value={newBundle.name} onChange={(e) => setNewBundle({...newBundle, name: e.target.value})} placeholder="Cth: Paket Seru Duo" style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Harga Paket (Rp)</label>
                      <input type="number" required value={newBundle.price} onChange={(e) => setNewBundle({...newBundle, price: e.target.value})} placeholder="Cth: 60000" style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }} />
                    </div>
                    
                    <div style={{ marginTop: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Isi Paket (Wahana + Jumlah Tiket):</label>
                      {wahanas.map(w => {
                        const selected = newBundle.selected_wahanas.find(sw => sw.wahana_id === w.id);
                        const isChecked = !!selected;
                        return (
                          <div key={w.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewBundle({...newBundle, selected_wahanas: [...newBundle.selected_wahanas, { wahana_id: w.id, quantity: 1 }]});
                                  } else {
                                    setNewBundle({...newBundle, selected_wahanas: newBundle.selected_wahanas.filter(sw => sw.wahana_id !== w.id)});
                                  }
                                }}
                              />
                              {w.name}
                            </label>
                            {isChecked && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Jumlah:</span>
                                <input 
                                  type="number" 
                                  min="1" 
                                  required
                                  value={selected!.quantity} 
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const newQty = val === '' ? '' : parseInt(val);
                                    setNewBundle({
                                      ...newBundle, 
                                      selected_wahanas: newBundle.selected_wahanas.map(sw => 
                                        sw.wahana_id === w.id ? { ...sw, quantity: newQty } : sw
                                      )
                                    });
                                  }}
                                  style={{ width: '60px', padding: '0.25rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem', flex: 1 }}>
                        {editingBundleId ? 'Simpan Perubahan' : '+ Tambah Paket Bundling'}
                      </button>
                      {editingBundleId && (
                        <button type="button" onClick={() => { setEditingBundleId(null); setNewBundle({ name: '', price: '', selected_wahanas: [] }); }} style={{ padding: '0.5rem', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>
                          Batal
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                <div style={{ flex: '2 1 500px', overflowX: 'auto' }}>
                  <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Daftar Paket Bundling Aktif</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem' }}>Nama Paket</th>
                        <th style={{ padding: '0.5rem' }}>Isi Wahana</th>
                        <th style={{ padding: '0.5rem' }}>Harga</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bundles.length === 0 ? (
                        <tr><td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>Belum ada paket bundling. Buat di sebelah kiri.</td></tr>
                      ) : bundles.map(pkg => (
                        <tr key={pkg.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{pkg.name}</td>
                          <td style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                            {pkg.package_wahanas?.map((pw: any) => `${pw.wahanas?.name || 'Wahana'} (${pw.quantity}x)`).join(', ') || '-'}
                          </td>
                          <td style={{ padding: '0.5rem', fontWeight: '600', color: '#059669' }}>Rp {pkg.price.toLocaleString('id-ID')}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => {
                              setEditingBundleId(pkg.id);
                              setNewBundle({
                                name: pkg.name,
                                price: pkg.price.toString(),
                                selected_wahanas: pkg.package_wahanas ? pkg.package_wahanas.map((pw: any) => ({ wahana_id: pw.wahana_id, quantity: pw.quantity })) : []
                              });
                            }} style={{ padding: '0.2rem 0.5rem', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
                            <button onClick={() => deleteBundle(pkg.id)} style={{ padding: '0.2rem 0.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem' }}>Hapus</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'TICKET_PACKAGES' && (
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginBottom: '0.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>📦 Paket Tiket Annual Pass</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>Paket ini digunakan saat pendaftaran Member Annual Pass baru. Tentukan nama, kapasitas, harga, dan wahana yang termasuk di dalam paket.</p>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px' }}>
                <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  {editingPkgId ? 'Edit Paket Tiket' : 'Tambah Paket Baru'}
                </h4>
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
                  <div style={{ marginTop: '0.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Termasuk Wahana Gratis:</label>
                    {wahanas.map(w => {
                      const selected = newPkg.selected_wahanas.find(sw => sw.wahana_id === w.id);
                      const isChecked = !!selected;
                      return (
                        <div key={w.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input type="checkbox" checked={isChecked} onChange={(e) => { if (e.target.checked) { setNewPkg({...newPkg, selected_wahanas: [...newPkg.selected_wahanas, { wahana_id: w.id, quantity: 1 }]}); } else { setNewPkg({...newPkg, selected_wahanas: newPkg.selected_wahanas.filter(sw => sw.wahana_id !== w.id)}); } }} />
                            {w.name}
                          </label>
                          {isChecked && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Jumlah:</span>
                              <input type="number" min="1" required value={selected!.quantity} onChange={(e) => { const val = e.target.value; const newQty = val === '' ? '' : parseInt(val); setNewPkg({ ...newPkg, selected_wahanas: newPkg.selected_wahanas.map(sw => sw.wahana_id === w.id ? { ...sw, quantity: newQty } : sw) }); }} style={{ width: '60px', padding: '0.25rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem', flex: 1 }}>{editingPkgId ? 'Simpan Perubahan' : '+ Tambah Paket'}</button>
                    {editingPkgId && (<button type="button" onClick={() => { setEditingPkgId(null); setNewPkg({ name: '', min_qty: 1, max_qty: 1, price: '', selected_wahanas: [] }); }} style={{ padding: '0.5rem', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>Batal</button>)}
                  </div>
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
                        <td style={{ padding: '0.5rem', textAlign: 'right', display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => { setEditingPkgId(pkg.id); setNewPkg({ name: pkg.name, min_qty: pkg.min_qty, max_qty: pkg.max_qty, price: pkg.price.toString(), selected_wahanas: pkg.package_wahanas ? pkg.package_wahanas.map((pw: any) => ({ wahana_id: pw.wahana_id, quantity: pw.quantity })) : [] }); }} style={{ padding: '0.2rem 0.5rem', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
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
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Manajemen User & Hak Akses Pegawai</h2>
                <p style={{ color: '#64748b', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>Atur akun login khusus Kasir POS, Petugas Scanner Wahana, dan Administrator</p>
              </div>
            </div>

            {/* Panduan Role Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', padding: '1rem', borderRadius: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ backgroundColor: '#15803d', color: '#fff', fontSize: '0.75rem', fontWeight: '800', padding: '0.2rem 0.5rem', borderRadius: '0.25rem' }}>ROLE: GATE</span>
                  <span style={{ fontWeight: '700', color: '#166534', fontSize: '0.85rem' }}>Pintu Gerbang Utama</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#14532d', margin: 0 }}>
                  👉 Khusus Komputer/Tablet <strong>AI Face Recognition Gate Masuk (/gate)</strong> untuk validasi Annual Pass rombongan.
                </p>
              </div>

              <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '1rem', borderRadius: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ backgroundColor: '#059669', color: '#fff', fontSize: '0.75rem', fontWeight: '800', padding: '0.2rem 0.5rem', borderRadius: '0.25rem' }}>ROLE: WAHANA</span>
                  <span style={{ fontWeight: '700', color: '#065f46', fontSize: '0.85rem' }}>Petugas Wahana (HP)</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#047857', margin: 0 }}>
                  👉 Khusus Smartphone <strong>Scanner Tiket Wahana (/gate-wahana)</strong> untuk scan voucher & potong kuota di pos wahana.
                </p>
              </div>

              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '1rem', borderRadius: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ backgroundColor: '#2563eb', color: '#fff', fontSize: '0.75rem', fontWeight: '800', padding: '0.2rem 0.5rem', borderRadius: '0.25rem' }}>ROLE: CASHIER</span>
                  <span style={{ fontWeight: '700', color: '#1e40af', fontSize: '0.85rem' }}>Kasir Loket POS</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#1d4ed8', margin: 0 }}>
                  👉 Khusus Komputer <strong>Kasir Loket (/pos)</strong> untuk transaksi penjualan tiket, top-up, & QRIS.
                </p>
              </div>

              <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a', padding: '1rem', borderRadius: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ backgroundColor: '#d97706', color: '#fff', fontSize: '0.75rem', fontWeight: '800', padding: '0.2rem 0.5rem', borderRadius: '0.25rem' }}>ROLE: ADMIN</span>
                  <span style={{ fontWeight: '700', color: '#92400e', fontSize: '0.85rem' }}>Manager & Backoffice</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#b45309', margin: 0 }}>
                  👉 Akses penuh ke <strong>Dashboard Keuangan, CRM, & Laporan (/admin)</strong>.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              {/* Form Tambah User */}
              <div style={{ flex: '1 1 320px', backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', color: '#0f172a' }}>+ Tambah Akun Pegawai</h3>
                <form onSubmit={addSystemUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.35rem' }}>Username Pegawai</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Cth: gate_utama / kasir1 / penjaga_offroad"
                      value={newSysUser.username} 
                      onChange={e => setNewSysUser({...newSysUser, username: e.target.value})} 
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.35rem' }}>Password Akun</label>
                    <input 
                      type="password" 
                      required 
                      placeholder="Minimal 6 karakter"
                      value={newSysUser.password} 
                      onChange={e => setNewSysUser({...newSysUser, password: e.target.value})} 
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.35rem' }}>Peruntukan Akun (Role)</label>
                    <select 
                      value={newSysUser.role} 
                      onChange={e => setNewSysUser({...newSysUser, role: e.target.value})}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.5rem', border: '1px solid #059669', fontSize: '0.9rem', fontWeight: '700', backgroundColor: '#f0fdf4' }}
                    >
                      <option value="GATE">🚪 GATE (Pintu Masuk Utama - Face Recognition AI)</option>
                      <option value="WAHANA">🎡 WAHANA (Petugas Scanner Tiket Wahana Lapangan)</option>
                      <option value="CASHIER">💳 CASHIER (Kasir Loket POS Tiket)</option>
                      <option value="ADMIN">👑 ADMIN (Full Akses Backoffice & Keuangan)</option>
                    </select>
                  </div>

                  {(newSysUser.role === 'WAHANA' || newSysUser.role === 'CASHIER') && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.35rem' }}>Penugasan Pos Wahana (Opsional)</label>
                      <select 
                        value={newSysUser.wahana_id} 
                        onChange={e => setNewSysUser({...newSysUser, wahana_id: e.target.value})}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#fff' }}
                      >
                        <option value="">-- Semua Wahana (Fleksibel) --</option>
                        {wahanas.map(w => (
                          <option key={w.id} value={w.id}>🎡 {w.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem' }}
                  >
                    Simpan Akun Pegawai
                  </button>
                </form>
              </div>

              {/* Tabel Daftar User */}
              <div style={{ flex: '2 1 500px', backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, color: '#0f172a' }}>Daftar Akun Pegawai Aktif ({systemUsers.length})</h3>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.8rem', backgroundColor: '#f8fafc' }}>
                        <th style={{ padding: '0.85rem 1.25rem' }}>Username</th>
                        <th style={{ padding: '0.85rem 1.25rem' }}>Role / Peruntukan</th>
                        <th style={{ padding: '0.85rem 1.25rem' }}>Tujuan Auto-Redirect</th>
                        <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {systemUsers.map(user => {
                        const isMainGate = user.role === 'GATE' && !user.wahana_id;
                        const isWahana = user.role === 'WAHANA' || (user.role === 'GATE' && user.wahana_id);
                        
                        return (
                          <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: '#0f172a' }}>
                              {user.username}
                            </td>
                            <td style={{ padding: '1rem 1.25rem' }}>
                              <span style={{ 
                                padding: '0.25rem 0.6rem', borderRadius: '0.35rem', fontSize: '0.75rem', fontWeight: '800',
                                backgroundColor: isMainGate ? '#dcfce7' : (isWahana ? '#ecfdf5' : (user.role === 'CASHIER' ? '#eff6ff' : '#fef3c7')),
                                color: isMainGate ? '#15803d' : (isWahana ? '#059669' : (user.role === 'CASHIER' ? '#2563eb' : '#d97706'))
                              }}>
                                {isMainGate ? '🚪 PINTU MASUK (FACE AI)' : (isWahana ? '🎡 PETUGAS WAHANA' : (user.role === 'CASHIER' ? '💳 KASIR POS' : '👑 ADMIN'))}
                              </span>
                            </td>
                            <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', fontSize: '0.85rem', color: '#475569' }}>
                              {isMainGate ? '/gate (Turnstile Face AI)' : (isWahana ? '/gate-wahana (Scanner HP)' : (user.role === 'CASHIER' ? '/pos (Kasir)' : '/admin (Backoffice)'))}
                            </td>
                            <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                              {user.username !== 'admin' && (
                                <button 
                                  onClick={() => deleteSystemUser(user.id)} 
                                  style={{ padding: '0.35rem 0.75rem', backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '0.35rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.8rem' }}
                                >
                                  Hapus
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ERROR_LOGS' && (() => {
          const logsPerPage = 15;
          // Reuse auditLogsPage state for pagination or create a separate one. For simplicity, we just show top 100 without pagination for now.
          return (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Error Logs</h2>
                  <p style={{ color: '#64748b', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>Pantau system crash, bug, dan error yang terjadi pada user</p>
                </div>
                <button onClick={fetchErrorLogs} style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>
                  Refresh Logs
                </button>
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem' }}>
                        <th style={{ padding: '1rem 1.5rem', width: '15%' }}>Waktu Kejadian</th>
                        <th style={{ padding: '1rem 1.5rem', width: '40%' }}>Pesan Error</th>
                        <th style={{ padding: '1rem 1.5rem', width: '20%' }}>Lokasi (URL)</th>
                        <th style={{ padding: '1rem 1.5rem', width: '25%' }}>Info Pengguna</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errorLogs.length === 0 ? (
                        <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Belum ada catatan error. Sistem berjalan dengan baik!</td></tr>
                      ) : errorLogs.map((log, idx) => (
                        <tr key={log.id || idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s', backgroundColor: idx % 2 === 0 ? 'white' : '#fcfcfc' }}>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: '#475569', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: '600' }}>{new Date(log.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}</div>
                            <div style={{ fontSize: '0.75rem' }}>{new Date(log.created_at).toLocaleTimeString('id-ID')} WIB</div>
                          </td>
                          <td style={{ padding: '1rem 1.5rem', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: '600', color: '#ef4444', marginBottom: '0.5rem' }}>{log.error_message}</div>
                            {log.error_stack && (
                              <details>
                                <summary style={{ fontSize: '0.8rem', color: '#64748b', cursor: 'pointer' }}>Lihat Stack Trace</summary>
                                <pre style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', fontSize: '0.75rem', color: '#334155', overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto' }}>
                                  {log.error_stack}
                                </pre>
                              </details>
                            )}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', verticalAlign: 'top', fontSize: '0.85rem', color: '#3b82f6', wordBreak: 'break-all' }}>
                            {log.url}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', verticalAlign: 'top', fontSize: '0.85rem', color: '#334155' }}>
                            {log.user_info ? (
                              <div>
                                <span style={{ fontWeight: 'bold' }}>Tipe:</span> {log.user_info.type}<br/>
                                {log.user_info.username && <><span style={{ fontWeight: 'bold' }}>Username:</span> {log.user_info.username}<br/></>}
                                {log.user_info.id && <><span style={{ fontWeight: 'bold' }}>ID:</span> <span style={{ fontSize: '0.75rem' }}>{log.user_info.id}</span></>}
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Anonim / Tidak login</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === 'AUDIT_LOGS' && (() => {
          // Filter logic
          const filteredLogs = auditLogs.filter(log => {
            if (auditFilterAction !== 'ALL' && log.action_type !== auditFilterAction) return false;
            return true;
          });
          
          const logsPerPage = 15;
          const totalLogsPages = Math.ceil(filteredLogs.length / logsPerPage);
          const currentLogs = filteredLogs.slice((auditLogsPage - 1) * logsPerPage, auditLogsPage * logsPerPage);

          return (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Audit Logs</h2>
                  <p style={{ color: '#64748b', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>Rekam jejak aktivitas pegawai dan administrator sistem</p>
                </div>
                <button 
                  onClick={fetchAuditLogs} 
                  style={{ padding: '0.5rem 1rem', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                  Refresh Logs
                </button>
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155' }}>Filter Aksi:</label>
                  <select 
                    value={auditFilterAction}
                    onChange={(e) => { setAuditFilterAction(e.target.value); setAuditLogsPage(1); }}
                    style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                  >
                    <option value="ALL">Semua Aksi</option>
                    <option value="CREATE">CREATE (Tambah Data)</option>
                    <option value="UPDATE">UPDATE (Ubah Data)</option>
                    <option value="DELETE">DELETE (Hapus Data)</option>
                    <option value="LOGIN">LOGIN (Masuk Sistem)</option>
                  </select>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem' }}>
                        <th style={{ padding: '1rem 1.5rem' }}>Waktu Kejadian</th>
                        <th style={{ padding: '1rem 1.5rem' }}>Aktor (Pegawai)</th>
                        <th style={{ padding: '1rem 1.5rem' }}>Tipe Aksi</th>
                        <th style={{ padding: '1rem 1.5rem' }}>Entitas / Modul</th>
                        <th style={{ padding: '1rem 1.5rem' }}>Detail Perubahan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentLogs.map((log, idx) => (
                        <tr key={log.id || idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s', backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: '#475569' }}>
                            <div style={{ fontWeight: '600' }}>{new Date(log.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}</div>
                            <div style={{ fontSize: '0.75rem' }}>{new Date(log.created_at).toLocaleTimeString('id-ID')} WIB</div>
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#0f172a' }}>
                            {log.actor_name || 'ADMIN'}
                          </td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <span style={{ 
                              padding: '0.2rem 0.6rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold',
                              backgroundColor: log.action_type === 'CREATE' ? '#dcfce7' : log.action_type === 'UPDATE' ? '#fef08a' : log.action_type === 'DELETE' ? '#fee2e2' : '#e0e7ff',
                              color: log.action_type === 'CREATE' ? '#166534' : log.action_type === 'UPDATE' ? '#854d0e' : log.action_type === 'DELETE' ? '#991b1b' : '#3730a3'
                            }}>
                              {log.action_type}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: '#334155', fontWeight: '600' }}>
                            {log.entity_type}
                            {log.entity_id && <span style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block', fontWeight: 'normal' }}>ID: {log.entity_id.substring(0,8)}...</span>}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: '#475569', maxWidth: '350px' }}>
                            {log.details ? (
                              <pre style={{ margin: 0, padding: '0.4rem', backgroundColor: '#f1f5f9', borderRadius: '0.4rem', fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                                {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details}
                              </pre>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                      {currentLogs.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                            Tidak ada log aktivitas yang ditemukan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalLogsPages > 1 && (
                  <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Halaman {auditLogsPage} dari {totalLogsPages}</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => setAuditLogsPage(p => Math.max(1, p - 1))} disabled={auditLogsPage === 1} style={{ padding: '0.4rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', cursor: auditLogsPage === 1 ? 'not-allowed' : 'pointer' }}>Sebelumnya</button>
                      <button onClick={() => setAuditLogsPage(p => Math.min(totalLogsPages, p + 1))} disabled={auditLogsPage === totalLogsPages} style={{ padding: '0.4rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', cursor: auditLogsPage === totalLogsPages ? 'not-allowed' : 'pointer' }}>Selanjutnya</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      <AICopilot 
        dashboardContext={{
          totalMembers: users.length,
          totalRevenuePOS: totalRevenue,
          totalRevenueTicket: transactions.filter(t => t.status === 'SUCCESS' || t.status === 'PAID').reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
          totalRevenueAll: totalRevenue + transactions.filter(t => t.status === 'SUCCESS' || t.status === 'PAID').reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
          totalUniqueVisitors: new Set(rawVisits.map(v => v.member_id).filter(Boolean)).size,
          totalVisitDays: new Set(rawVisits.map(v => new Date(v.visited_at).toLocaleDateString('id-ID'))).size,
          activeMembers: users.filter(u => u.status === 'ACTIVE').length,
          pendingMembers: users.filter(u => u.status === 'PENDING_PAYMENT').length,
          recentTransactions: transactions.slice(0, 10).map(t => ({ amount: t.amount, package: t.package_name, date: t.created_at, status: t.status, buyer: t.buyer_name })),
          recentPosTransactions: posTransactions.slice(0, 10).map(t => ({ location: t.location, amount: t.amount, date: t.created_at })),
          memberNames: users.slice(0, 20).map(u => ({ name: u.name, status: u.status, visits: rawVisits.filter(v => v.member_id === u.id).length, points: u.points_balance || 0 }))
        }}
        onExportCsvRequest={(action) => {
          if (action.includes('CSV')) {
            handleExportCSV();
          }
        }}
      />
      </main>
    </div>
  );
}
