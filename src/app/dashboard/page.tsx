"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

import Sidebar from './_components/Sidebar';
import DashboardTab from './_components/DashboardTab';

import VisitsTab from './_components/VisitsTab';
import AnggotaKeluargaTab from './_components/AnggotaKeluargaTab';
import TransactionsTab from './_components/TransactionsTab';
import EventsTab from './_components/EventsTab';
import SchedulesTab from './_components/SchedulesTab';
import ProfileTab from './_components/ProfileTab';
import { useLanguage, LANGUAGES } from '@/contexts/LanguageContext';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  const handleLogout = () => {
    localStorage.removeItem('tempUserId');
    localStorage.removeItem('tempGroupId');
    localStorage.removeItem('tempUserName');
    window.location.href = '/';
  };

  // Load saved tab on mount and sync to state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab');
      
      if (tabParam) {
        setCurrentTab(tabParam);
      } else {
        const savedTab = sessionStorage.getItem('dashboardTab');
        if (savedTab) setCurrentTab(savedTab);
      }
    }
  }, []);

  // Sync tab changes to URL and Session Storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('dashboardTab', currentTab);
      
      const searchParams = new URLSearchParams(window.location.search);
      const currentUrlTab = searchParams.get('tab') || 'dashboard';
      
      if (currentUrlTab !== currentTab) {
        const url = new URL(window.location.href);
        if (currentTab === 'dashboard') {
          url.searchParams.delete('tab');
        } else {
          url.searchParams.set('tab', currentTab);
        }
        window.history.pushState({ tab: currentTab }, '', url.toString());
      }
    }
  }, [currentTab]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const searchParams = new URLSearchParams(window.location.search);
      setCurrentTab(searchParams.get('tab') || 'dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let storedId = '';
        if (typeof window !== 'undefined') {
          storedId = localStorage.getItem('tempUserId') || '';
          if (!storedId) {
            const storedGroupId = localStorage.getItem('tempGroupId');
            if (storedGroupId) {
              const { data, error: groupErr } = await supabase
                .from('members')
                .select('id')
                .eq('group_id', storedGroupId)
                .order('created_at', { ascending: true })
                .limit(1)
                .single();
              if (data) storedId = data.id;
              if (groupErr) setDebugInfo((prev: any) => ({ ...prev, groupErr }));
            } else {
              setDebugInfo((prev: any) => ({ ...prev, noStoredGroupId: true }));
            }
          }
        }

        if (!storedId) {
          setDebugInfo((prev: any) => ({ ...prev, noStoredId: true }));
          setLoading(false);
          return;
        }

        const { data: memberData, error: memberErr } = await supabase
          .from('members')
          .select('*')
          .eq('id', storedId)
          .limit(1)
          .single();

        if (memberErr) setDebugInfo((prev: any) => ({ ...prev, memberErr }));

        if (memberData && !memberErr) {
          if (memberData.status === 'PENDING_PAYMENT') {
            if (typeof window !== 'undefined') {
              localStorage.setItem('tempGroupId', memberData.group_id);
              localStorage.setItem('tempUserName', memberData.name);
              window.location.href = '/payment';
            }
            return;
          }
          
          setUser(memberData);
          
          const { data: familyData } = await supabase
            .from('members')
            .select('*')
            .eq('group_id', memberData.group_id);
            
          if (familyData) {
            setFamilyMembers(familyData);
            
            const memberIds = familyData.map(m => m.id);
            const { data: visitsData } = await supabase
              .from('visits')
              .select('*')
              .in('member_id', memberIds)
              .order('visited_at', { ascending: false });
              
            if (visitsData) {
              setVisits(visitsData);
            }
          }
        }
      } catch (err) {
        console.error("Dashboard fetch error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}><p>Memuat Dashboard...</p></div>;
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
        <p>Sesi tidak valid. <Link href="/" style={{color: 'var(--primary-color)'}}>Kembali</Link></p>
        <pre style={{ marginTop: '1rem', background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '0.5rem', maxWidth: '80%', overflow: 'auto', fontSize: '0.75rem' }}>
          DEBUG INFO: {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>
    );
  }

  const activation = new Date(user.activation_date || new Date());
  const expiration = new Date(activation);
  expiration.setFullYear(expiration.getFullYear() + 1);

  const thisMonthVisits = visits.filter(v => {
    const vDate = new Date(v.visited_at);
    const now = new Date();
    return vDate.getMonth() === now.getMonth() && vDate.getFullYear() === now.getFullYear();
  });

  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardTab 
          user={user} 
          visits={visits} 
          thisMonthVisits={thisMonthVisits}
          isFlipped={isFlipped} 
          setIsFlipped={setIsFlipped} 
          expiration={expiration} 
          setCurrentTab={setCurrentTab}
          familyMembers={familyMembers}
        />;
      case 'visits':
        return <VisitsTab visits={visits} familyMembers={familyMembers} />;
      case 'family':
        return <AnggotaKeluargaTab familyMembers={familyMembers} visits={visits} />;
      case 'transactions':
        return <TransactionsTab familyMembers={familyMembers} />;
      case 'events':
        return <EventsTab />;
      case 'schedules':
        return <SchedulesTab />;
      case 'profile':
        return <ProfileTab user={user} />;
      default:
        return <DashboardTab 
          user={user} 
          visits={visits} 
          thisMonthVisits={thisMonthVisits}
          isFlipped={isFlipped} 
          setIsFlipped={setIsFlipped} 
          expiration={expiration} 
          setCurrentTab={setCurrentTab}
          familyMembers={familyMembers}
        />;
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

      {/* SIDEBAR COMPONENT */}
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
      />

      {/* MAIN CONTENT */}
      <main style={{ position: 'relative', zIndex: 1, flex: 1, padding: '2rem 3rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* HEADER */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            </button>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.25rem' }}>{t('welcome_back')}, <span className="notranslate" translate="no">{user.name.split(' ')[0]}</span>!</h1>
              <p style={{ color: '#64748b' }}>{t('ready_for_adventure')}</p>
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
                <span className="notranslate" translate="no" style={{ fontSize: '1.25rem', lineHeight: 1 }}>
                  {LANGUAGES.find(l => l.code === language)?.flag || '🇮🇩'}
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
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'}
                onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                {user.photo_url ? (
                   <img src={user.photo_url} alt="Profile" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                   <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                     {user.name.charAt(0).toUpperCase()}
                   </div>
                )}
                <span style={{ fontWeight: '500', fontSize: '0.875rem', color: '#0f172a' }}>
                  <span>{t('hi')}</span>, <span className="notranslate" translate="no">{user.name.split(' ')[0]}</span>
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ transform: isProfileOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><path d="m6 9 6 6 6-6"/></svg>
              </button>

              {isProfileOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.75rem', background: 'white', borderRadius: '1rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', width: '220px', overflow: 'hidden', zIndex: 50, animation: 'fadeIn 0.2s ease-out' }}>
                  <div style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                    <p className="notranslate" translate="no" style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.25rem' }}>{user.name}</p>
                    <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{user.email || user.phone}</p>
                  </div>
                  <div style={{ padding: '0.5rem' }}>
                    <button 
                      onClick={() => { setIsProfileOpen(false); setCurrentTab('profile'); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: '#334155', fontWeight: '500', cursor: 'pointer', borderRadius: '0.5rem', textAlign: 'left' }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#059669'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#334155'; }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      {t('my_profile')}
                    </button>
                    <div style={{ height: '1px', background: '#f1f5f9', margin: '0.25rem 0' }}></div>
                    <button 
                      onClick={handleLogout}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: '#ef4444', fontWeight: '600', cursor: 'pointer', borderRadius: '0.5rem', textAlign: 'left' }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                      {t('logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* TAB CONTENT IS NOW HANDLED BY renderTabContent() */}
        {renderTabContent()}

      </main>
    </div>
  );
}
