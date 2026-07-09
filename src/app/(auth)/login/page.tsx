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
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#00A2C9] via-[#0096D2] to-[#005E82] relative overflow-hidden flex-col justify-between p-12 lg:p-16">
        {/* Glow ambient light beams */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-white/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#FFDE00]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-block bg-white/95 px-5 py-3 rounded-2xl shadow-md border border-white/20 backdrop-blur-xs">
            <img src="/logo.png" alt="PLN Logo" className="h-9 w-auto object-contain" />
          </div>
        </div>

        <div className="relative z-10 my-auto">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white leading-[1.15] tracking-tight">
            Sistem Digitalisasi
            <span className="text-[#FFDE00] block mt-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]">
              Assessment Trafo
            </span>
          </h2>
          <p className="text-sky-100/90 text-base lg:text-lg max-w-lg mt-6 leading-relaxed font-normal">
            Platform monitoring dan assessment kondisi transformator tenaga untuk PT PLN Indonesia Power — Maintenance Business Unit.
          </p>
        </div>


      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-10">
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <img src="/logo.png" alt="PLN Logo" className="h-12 w-auto object-contain" />
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-on-surface mb-1">Masuk ke Aplikasi</h2>
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
