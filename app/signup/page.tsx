'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);
    const supabase = createClient();
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/studio` },
    });
    setLoading(false);
    if (error) { setErr(error.message); return; }

    if (data.session) {
      router.push('/studio');
      router.refresh();
    } else {
      setMsg('Check your email to confirm your account.');
    }
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

        <h1 className="font-serif text-3xl italic font-light mb-2">Get started.</h1>
        <p className="text-text-muted mb-8">A workspace is created automatically.</p>

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
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input"
              placeholder="At least 6 characters"
            />
          </div>
          {err && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md p-3">{err}</div>}
          {msg && <div className="text-sm text-green-800 bg-green-50 border border-green-100 rounded-md p-3">{msg}</div>}
          <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-text-muted text-center mt-8">
          Already have an account?{' '}
          <Link href="/login" className="text-orange hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
