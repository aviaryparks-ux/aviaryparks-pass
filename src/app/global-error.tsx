"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to our internal logger
    fetch('/api/error-logger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message || 'Unknown Error',
        stack: error.stack,
        url: typeof window !== 'undefined' ? window.location.href : 'Unknown URL'
      })
    }).catch(e => console.error('Failed to log error to backend:', e));
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
          <h2>Oops, terjadi kesalahan sistem!</h2>
          <p>Laporan kerusakan telah dikirim secara otomatis ke tim teknis kami.</p>
          <button 
            onClick={() => reset()}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Coba Lagi
          </button>
        </div>
      </body>
    </html>
  );
}
