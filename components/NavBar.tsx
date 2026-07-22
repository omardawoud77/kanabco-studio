'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const link = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
          active ? 'bg-orange/10 text-orange font-medium' : 'text-text-muted hover:text-text'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="border-b border-border bg-bg-card/60 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/studio" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-orange flex items-center justify-center text-white font-bold text-sm">K</div>
          <span className="font-serif text-base font-medium">Kanabco Prompt</span>
        </Link>
        <div className="flex items-center gap-1">
          {link('/studio', 'Studio')}
          {link('/products', 'Products')}
          {link('/library', 'Library')}
          {link('/team', 'Team')}
          <button onClick={signOut} className="ml-2 px-3 py-1.5 text-sm text-text-faint hover:text-text">
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
