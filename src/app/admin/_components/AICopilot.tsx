"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from 'ai/react';
import AIChart from './AIChart';

export default function AICopilot({ dashboardContext, onExportCsvRequest }: { dashboardContext?: any, onExportCsvRequest?: (action: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/admin/copilot',
    initialMessages: [
      { 
        id: 'welcome', 
        role: 'assistant', 
        content: 'Halo! Saya AI Data Analyst Anda. Ada yang bisa saya bantu terkait laporan keuangan atau data pengunjung hari ini?' 
      }
    ],
    maxToolRoundtrips: 3,
    onError: (err) => {
      console.error('Chat error:', err);
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          transition: 'transform 0.2s',
          transform: isOpen ? 'scale(0.9)' : 'scale(1)'
        }}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="M12 7v4"></path><path d="M12 15h.01"></path></svg>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '6.5rem',
          right: '2rem',
          width: '380px',
          height: '550px',
          backgroundColor: 'white',
          borderRadius: '1rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          zIndex: 9998,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          animation: 'slideUp 0.3s ease-out'
        }}>
          {/* Header */}
          <div style={{
            backgroundColor: '#059669', // Emerald color
            color: 'white',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{ width: '32px', height: '32px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="M9 9h6"></path><path d="M9 13h4"></path></svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>Aviary Assistant</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>AI Data Analyst • Smart Copilot</p>
            </div>
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1,
            padding: '1rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            backgroundColor: '#f8fafc'
          }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {msg.content && (
                  <div style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    backgroundColor: msg.role === 'user' ? '#059669' : 'white',
                    color: msg.role === 'user' ? 'white' : '#1e293b',
                    padding: '0.75rem 1rem',
                    borderRadius: msg.role === 'user' ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {msg.content}
                  </div>
                )}
                
                {/* Render Tool Invocations */}
                {msg.toolInvocations?.map(toolInvocation => {
                  if (toolInvocation.toolName === 'renderChart') {
                    // Client-side tool: baca dari args langsung.
                    const chartData = toolInvocation.args;
                    if (chartData && chartData.data && chartData.data.length > 0) {
                      return (
                        <div key={toolInvocation.toolCallId} style={{ alignSelf: 'center', width: '100%', padding: '0.5rem' }}>
                          <AIChart 
                            type={chartData.type || 'bar'} 
                            data={chartData.data} 
                            title={chartData.title || ''} 
                            color="#059669" 
                          />
                        </div>
                      );
                    } else {
                      return (
                        <div key={toolInvocation.toolCallId} className="text-xs text-slate-400 italic flex items-center gap-1">
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          Menyiapkan data grafik...
                        </div>
                      );
                    }
                  } else if (toolInvocation.state !== 'result') {
                    return (
                      <div key={toolInvocation.toolCallId} className="text-xs text-slate-400 italic flex items-center gap-1">
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Memeriksa database ({toolInvocation.toolName})...
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ))}
            
            {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
              <div style={{
                alignSelf: 'flex-start',
                backgroundColor: 'white',
                padding: '0.75rem 1rem',
                borderRadius: '1rem 1rem 1rem 0',
                border: '1px solid #e2e8f0',
                display: 'flex',
                gap: '0.25rem'
              }}>
                <div style={{ width: '8px', height: '8px', backgroundColor: '#94a3b8', borderRadius: '50%', animation: 'bounce 1s infinite' }}></div>
                <div style={{ width: '8px', height: '8px', backgroundColor: '#94a3b8', borderRadius: '50%', animation: 'bounce 1s infinite 0.2s' }}></div>
                <div style={{ width: '8px', height: '8px', backgroundColor: '#94a3b8', borderRadius: '50%', animation: 'bounce 1s infinite 0.4s' }}></div>
              </div>
            )}
            {error && (
              <div style={{
                alignSelf: 'center',
                backgroundColor: '#fee2e2',
                color: '#ef4444',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                fontSize: '0.85rem',
                maxWidth: '90%',
                textAlign: 'center',
                border: '1px solid #fca5a5'
              }}>
                <strong>Terjadi Kesalahan:</strong><br />
                {error.message || 'Gagal menghubungi server AI.'}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} style={{
            padding: '1rem',
            backgroundColor: 'white',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: '0.5rem'
          }}>
            <input 
              type="text" 
              placeholder="Tanya soal pendapatan, pengunjung..."
              value={input}
              onChange={handleInputChange}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                borderRadius: '2rem',
                border: '1px solid #cbd5e1',
                outline: 'none',
                fontSize: '0.9rem'
              }}
            />
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{
                backgroundColor: input.trim() && !isLoading ? '#059669' : '#94a3b8',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                transition: 'background-color 0.2s'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </form>
          
          <style>{`
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-5px); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
