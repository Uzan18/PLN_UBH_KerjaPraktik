'use client';

/**
 * Custom Global Error page for unexpected runtime errors.
 * Must be a Client Component but must NOT use Providers/useState
 * to allow static prerendering by Next.js build.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: 'sans-serif', backgroundColor: '#0f172a', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '4rem', fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>500</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginTop: '1rem', color: '#f1f5f9' }}>
            Terjadi Kesalahan
          </h1>
          <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>
            Terjadi kesalahan yang tidak terduga. Tim teknis telah diberitahu.
          </p>
          {error.digest && (
            <p style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              display: 'inline-block',
              marginTop: '1.5rem',
              padding: '0.6rem 1.5rem',
              backgroundColor: '#ef4444',
              color: '#fff',
              borderRadius: '0.375rem',
              border: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Coba Lagi
          </button>
        </div>
      </body>
    </html>
  );
}
