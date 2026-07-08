'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@pln.co.id');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await signIn('credentials', { email, password, redirect: false });
    
    if (res?.error) {
      setError('Invalid credentials');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2 border-b pb-6">
          <h1 className="text-3xl font-bold text-slate-900">SIAT</h1>
          <p className="text-sm text-slate-500 font-medium tracking-wide">Sistem Digitalisasi Assessment Trafo</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm font-medium text-center">{error}</div>}
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              required 
            />
          </div>

          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition shadow-md">
            Login
          </button>
        </form>

        <div className="pt-4 border-t text-xs text-slate-400 text-center">
          <p>Dev Accounts:</p>
          <div className="flex justify-center gap-3 mt-1">
            <button onClick={() => setEmail('viewer@pln.co.id')} className="hover:text-blue-500">Viewer</button>
            <button onClick={() => setEmail('input@pln.co.id')} className="hover:text-blue-500">Input</button>
            <button onClick={() => setEmail('qc@pln.co.id')} className="hover:text-blue-500">QC</button>
            <button onClick={() => setEmail('admin@pln.co.id')} className="hover:text-blue-500 font-bold">Admin</button>
          </div>
        </div>
      </div>
    </div>
  );
}