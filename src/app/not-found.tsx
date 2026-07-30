import Link from 'next/link';

/**
 * Custom 404 Not Found page.
 * Styled cleanly to fit within the application layout.
 */
export default function NotFound() {
  return (
    <div style={{ margin: 0, fontFamily: 'sans-serif', backgroundColor: '#0f172a', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '4rem', fontWeight: 800, color: '#3b82f6', lineHeight: 1 }}>404</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginTop: '1rem', color: '#f1f5f9' }}>
          Halaman Tidak Ditemukan
        </h1>
        <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>
          Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            marginTop: '1.5rem',
            padding: '0.6rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: '#fff',
            borderRadius: '0.375rem',
            textDecoration: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
          }}
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
