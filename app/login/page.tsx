'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    router.push('/studio');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-lg bg-orange flex items-center justify-center text-white font-bold">K</div>
          <div>
            <div className="font-serif text-2xl font-medium leading-none">Catalog Studio</div>
            <div className="text-xs text-text-muted uppercase tracking-wider mt-1">Kanabco</div>
          </div>
        </div>

        <h1 className="font-serif text-3xl italic font-light mb-2">Welcome back.</h1>
        <p className="text-text-muted mb-8">Sign in to your workspace.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-text-muted mb-2 font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
              placeholder="you@kanabco.com"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-text-muted mb-2 font-medium">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>
          {err && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md p-3">{err}</div>}
          <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-text-muted text-center mt-8">
          New here?{' '}
          <Link href="/signup" className="text-orange hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
