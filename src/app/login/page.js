'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true); setMessage('');
    try {
      const supabase = createClient();
      const result = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/dashboard` } });
      if (result.error) throw result.error;
      if (mode === 'signup' && !result.data.session) {
        setMessage('Account created. Check your email to confirm your account, then log in.');
      } else {
        router.push('/dashboard'); router.refresh();
      }
    } catch (error) {
      setMessage(error?.message || 'Authentication failed. Check your Supabase setup.');
    } finally { setBusy(false); }
  }

  return <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
    <section className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-xl">
      <p className="text-sm font-semibold text-sky-400">VISIONAIRE CANVAS AI</p>
      <h1 className="mt-3 text-3xl font-bold">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
      <p className="mt-2 text-slate-400">Save your concept maps and continue learning later.</p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm">Email<input className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label className="block text-sm">Password<input className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} required value={password} onChange={e => setPassword(e.target.value)} /></label>
        <button disabled={busy} className="w-full rounded-lg bg-sky-500 p-3 font-semibold text-slate-950 disabled:opacity-50">{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}</button>
      </form>
      {message && <p role="status" className="mt-4 text-sm text-amber-300">{message}</p>}
      <p className="mt-5 text-sm text-slate-400">{mode === 'login' ? 'New here?' : 'Already have an account?'}{' '}
        <button className="font-semibold text-sky-400 underline" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }}>{mode === 'login' ? 'Create an account' : 'Log in'}</button>
      </p>
      <Link className="mt-5 inline-block text-sm text-slate-400 underline" href="/">Back to map</Link>
    </section>
  </main>;
}
