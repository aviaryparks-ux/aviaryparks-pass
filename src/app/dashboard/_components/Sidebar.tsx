import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Sidebar({
  isSidebarOpen,
  currentTab,
  setCurrentTab,
}: {
  isSidebarOpen: boolean;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <aside style={{ 
      position: 'relative', 
      zIndex: 1, 
      width: isSidebarOpen ? '260px' : '0px', 
      overflow: 'hidden',
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      backgroundColor: '#022c22', // Deep premium dark forest green
      borderRight: isSidebarOpen ? '1px solid rgba(255,255,255,0.05)' : 'none', 
      display: 'flex', 
      flexDirection: 'column',
      boxShadow: '4px 0 24px rgba(0,0,0,0.05)'
    }}>
      {/* Plant Motif Pattern Overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `url('/aviary_pattern.png') left top / cover`,
        opacity: 0.1, // Subtle texture
        pointerEvents: 'none',
        zIndex: 0
      }}></div>

      <div style={{ position: 'relative', zIndex: 1, width: '260px', padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* Hanging Logo Tab */}
      <div style={{ 
          position: 'relative', 
          padding: '1rem 2rem 1.5rem 2rem',
          marginBottom: '3rem',
          marginTop: '-1.5rem', // attach to top edge
          alignSelf: 'center', // Center the tab in the sidebar
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10
      }}>
        {/* 3D Trapezoid Background */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#f0fdf4',
          transform: 'perspective(150px) rotateX(-10deg)',
          transformOrigin: 'top',
          borderBottomLeftRadius: '1.5rem',
          borderBottomRightRadius: '1.5rem',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          zIndex: -1
        }}></div>
        <img src="/logo.png" alt="Aviary Park Indonesia" style={{ height: '70px', width: 'auto' }} />
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, position: 'relative', zIndex: 10 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); setCurrentTab('dashboard'); }} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', backgroundColor: currentTab === 'dashboard' ? 'rgba(255,255,255,0.1)' : 'transparent', color: currentTab === 'dashboard' ? '#ffffff' : '#94a3b8', borderRadius: '0.5rem', fontWeight: currentTab === 'dashboard' ? '600' : '400', textDecoration: 'none', borderLeft: currentTab === 'dashboard' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          {t('dashboard')}
        </a>
        <a href="#" onClick={(e) => { e.preventDefault(); setCurrentTab('visits'); }} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', backgroundColor: currentTab === 'visits' ? 'rgba(255,255,255,0.1)' : 'transparent', color: currentTab === 'visits' ? '#ffffff' : '#94a3b8', borderRadius: '0.5rem', fontWeight: currentTab === 'visits' ? '600' : '400', textDecoration: 'none', borderLeft: currentTab === 'visits' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          {t('my_visits')}
        </a>
        <a href="#" onClick={(e) => { e.preventDefault(); setCurrentTab('family'); }} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', backgroundColor: currentTab === 'family' ? 'rgba(255,255,255,0.1)' : 'transparent', color: currentTab === 'family' ? '#ffffff' : '#94a3b8', borderRadius: '0.5rem', fontWeight: currentTab === 'family' ? '600' : '400', textDecoration: 'none', borderLeft: currentTab === 'family' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          {t('family_members')}
        </a>
        <a href="#" onClick={(e) => { e.preventDefault(); setCurrentTab('events'); }} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', backgroundColor: currentTab === 'events' ? 'rgba(255,255,255,0.1)' : 'transparent', color: currentTab === 'events' ? '#ffffff' : '#94a3b8', borderRadius: '0.5rem', fontWeight: currentTab === 'events' ? '600' : '400', textDecoration: 'none', borderLeft: currentTab === 'events' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/></svg>
          {t('events_promo')}
        </a>
        <a href="#" onClick={(e) => { e.preventDefault(); setCurrentTab('schedules'); }} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', backgroundColor: currentTab === 'schedules' ? 'rgba(255,255,255,0.1)' : 'transparent', color: currentTab === 'schedules' ? '#ffffff' : '#94a3b8', borderRadius: '0.5rem', fontWeight: currentTab === 'schedules' ? '600' : '400', textDecoration: 'none', borderLeft: currentTab === 'schedules' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {t('schedules')}
        </a>
        <a href="#" onClick={(e) => { e.preventDefault(); setCurrentTab('transactions'); }} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', backgroundColor: currentTab === 'transactions' ? 'rgba(255,255,255,0.1)' : 'transparent', color: currentTab === 'transactions' ? '#ffffff' : '#94a3b8', borderRadius: '0.5rem', fontWeight: currentTab === 'transactions' ? '600' : '400', textDecoration: 'none', borderLeft: currentTab === 'transactions' ? '3px solid #f59e0b' : '3px solid transparent', transition: 'all 0.2s' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          {t('transactions')}
        </a>
      </nav>


      {/* Rangkong Image Overlay */}
      <img 
        src="/rangkong.png" 
        alt="Burung Rangkong" 
        style={{
          position: 'absolute',
          bottom: '-10px',
          left: 0,
          width: '100%',
          objectFit: 'contain',
          pointerEvents: 'none',
          zIndex: 5,
          opacity: isSidebarOpen ? 1 : 0,
          transition: 'opacity 0.3s'
        }}
      />
      
      </div>
    </aside>
  );
}
