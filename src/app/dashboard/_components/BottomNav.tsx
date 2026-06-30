import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BottomNav({
  currentTab,
  setCurrentTab,
}: {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <nav className="dash-bottom-nav">
      <button 
        onClick={() => setCurrentTab('dashboard')} 
        className="nav-btn-mobile"
        style={{ color: currentTab === 'dashboard' ? '#059669' : '#94a3b8', display: 'flex', alignItems: 'center', background: 'transparent', border: 'none' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>{t('dashboard')}</span>
      </button>
      
      <button 
        onClick={() => setCurrentTab('visits')} 
        className="nav-btn-mobile"
        style={{ color: currentTab === 'visits' ? '#059669' : '#94a3b8', display: 'flex', alignItems: 'center', background: 'transparent', border: 'none' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
        <span>Tiket</span>
      </button>
      
      <button 
        onClick={() => setCurrentTab('family')} 
        className="nav-btn-mobile"
        style={{ color: currentTab === 'family' ? '#059669' : '#94a3b8', display: 'flex', alignItems: 'center', background: 'transparent', border: 'none' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span>Anggota</span>
      </button>
      
      <button 
        onClick={() => setCurrentTab('events')} 
        className="nav-btn-mobile"
        style={{ color: currentTab === 'events' ? '#059669' : '#94a3b8', display: 'flex', alignItems: 'center', background: 'transparent', border: 'none' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/></svg>
        <span>Promo</span>
      </button>
    </nav>
  );
}
