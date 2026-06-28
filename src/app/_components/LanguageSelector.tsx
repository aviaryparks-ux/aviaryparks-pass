"use client";

import { useState } from 'react';
import { useLanguage, LANGUAGES } from '@/contexts/LanguageContext';

export default function LanguageSelector() {
  const { t, language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
        onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'}
        onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)'}
      >
        <span className="notranslate" translate="no" style={{ fontSize: '1.25rem', lineHeight: 1 }}>
          {LANGUAGES.find(l => l.code === language)?.flag || '🇮🇩'}
        </span>
      </button>

      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.75rem', background: 'white', borderRadius: '1rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', width: '240px', overflow: 'hidden', zIndex: 50, animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <p style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#0f172a' }}>{t('select_language')}</p>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {LANGUAGES.map((lang) => (
              <button 
                key={lang.code}
                onClick={() => { setLanguage(lang.code as any); setIsOpen(false); }}
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
  );
}
