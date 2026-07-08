'use client';

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden flex-col justify-between p-12">
        {/* Decorative elements */}
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute top-1/3 -right-10 w-60 h-60 bg-white/5 rounded-full" />
        <div className="absolute bottom-10 left-10 w-40 h-40 bg-white/5 rounded-full" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center">
              <span
                className="material-symbols-outlined text-white text-2xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                electric_bolt
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">SIAT PLN</h1>
              <p className="text-[10px] text-white/60 font-mono tracking-[0.2em] uppercase">
                Assessment Trafo
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4 tracking-tight">
            Sistem Digitalisasi
            <br />
            Assessment Trafo
          </h2>
          <p className="text-white/70 max-w-md leading-relaxed">
            Platform monitoring dan assessment kondisi transformator tenaga untuk PT PLN Indonesia Power — Maintenance Business Unit.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6">
          {[
            { icon: 'speed', label: 'Real-time Monitoring' },
            { icon: 'verified', label: 'Validasi Teknis' },
            { icon: 'analytics', label: 'Analisis Otomatis' },
          ].map((feature) => (
            <div key={feature.label} className="flex items-center gap-2">
              <span className="material-symbols-outlined text-white/60 text-sm">
                {feature.icon}
              </span>
              <span className="text-white/60 text-xs font-medium">{feature.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span
                className="material-symbols-outlined text-white text-xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                electric_bolt
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">SIAT PLN</h1>
              <p className="text-[10px] text-on-surface-variant font-mono tracking-[0.15em] uppercase">
                Assessment Trafo
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-on-surface mb-1">Masuk ke SIAT</h2>
            <p className="text-on-surface-variant">
              Gunakan kredensial akun internal Anda.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-error-container text-error rounded-lg flex items-center gap-3 animate-fade-in">
              <span className="material-symbols-outlined text-lg">error</span>
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block font-mono text-xs tracking-wider text-on-surface-variant uppercase font-bold"
              >
                Email
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-lg">mail</span>
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@plnip.co.id"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 bg-white border-2 border-outline-variant rounded-lg text-sm focus:border-primary focus:ring-0 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block font-mono text-xs tracking-wider text-on-surface-variant uppercase font-bold"
              >
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-lg">lock</span>
                </span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-3 bg-white border-2 border-outline-variant rounded-lg text-sm focus:border-primary focus:ring-0 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-white py-3 rounded-lg font-bold text-sm hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  Masuk
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-surface-border">
            <p className="text-center text-xs text-on-surface-variant">
              Hubungi administrator jika Anda belum memiliki akun atau
              lupa password.
            </p>
          </div>

          <footer className="mt-12 text-center">
            <p className="font-mono text-[10px] text-on-surface-variant/40 uppercase tracking-widest">
              SIAT v1.0 — PT PLN Indonesia Power
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-surface-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
