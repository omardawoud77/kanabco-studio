'use client';

import { useEffect, useState } from 'react';
import { NavBar } from '@/components/NavBar';
import { ToastProvider, useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase-browser';
import type { LibraryEntry } from '@/lib/types';

export default function LibraryPage() {
  return (
    <ToastProvider>
      <NavBar />
      <Library />
    </ToastProvider>
  );
}

function Library() {
  const toast = useToast();
  const [entries, setEntries] = useState<LibraryEntry[] | null>(null);
  const [filter, setFilter] = useState('');

  async function load() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('library_entries')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      setEntries([]);
      return;
    }
    setEntries(data || []);
  }

  useEffect(() => { load(); }, []);

  async function deleteEntry(id: string) {
    if (!confirm('Delete this entry?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('library_entries').delete().eq('id', id);
    if (error) { toast('Delete failed'); return; }
    toast('Deleted');
    load();
  }

  function copyPrompt(prompt: string) {
    navigator.clipboard.writeText(prompt);
    toast('Copied');
  }

  const filtered = entries?.filter(e =>
    !filter ||
    e.title.toLowerCase().includes(filter.toLowerCase()) ||
    e.subtitle?.toLowerCase().includes(filter.toLowerCase())
  ) || [];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <header className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl italic font-light">Library</h1>
          <p className="text-text-muted mt-1">All saved prompts and generated images for your workspace.</p>
        </div>
        <input
          type="text"
          placeholder="Filter…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="input max-w-xs"
        />
      </header>

      {entries === null && (
        <div className="text-center py-20 text-text-muted text-sm pulse-soft">Loading…</div>
      )}

      {entries && filtered.length === 0 && (
        <div className="bg-bg-card border border-border rounded-2xl p-12 text-center">
          <div className="font-serif italic text-xl text-text-muted mb-2">
            {filter ? 'No matches.' : 'Empty for now.'}
          </div>
          <div className="text-sm text-text-faint">
            {filter ? 'Try a different search.' : 'Saved prompts will appear here.'}
          </div>
        </div>
      )}

      {entries && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(e => (
            <div key={e.id} className="bg-bg-card border border-border rounded-xl overflow-hidden flex flex-col">
              {e.image_url ? (
                <a href={e.image_url} target="_blank" rel="noopener" className="block aspect-[2/3] bg-bg-soft overflow-hidden">
                  <img src={e.image_url} alt={e.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </a>
              ) : (
                <div className="aspect-[2/3] bg-bg-soft flex items-center justify-center text-text-faint text-xs italic">
                  Prompt only · no image
                </div>
              )}
              <div className="p-4 flex-1 flex flex-col">
                <div className="font-semibold text-sm mb-0.5 leading-tight">{e.title}</div>
                <div className="text-xs text-text-muted mb-3">{e.subtitle}</div>
                <div className="text-[10px] uppercase tracking-wider text-text-faint mt-auto pt-3 border-t border-border flex items-center justify-between gap-2">
                  <span>{new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <div className="flex gap-1">
                    <button onClick={() => copyPrompt(e.prompt)} className="p-1.5 rounded hover:bg-bg-soft" title="Copy prompt">⎘</button>
                    {e.image_url && (
                      <a href={e.image_url} download className="p-1.5 rounded hover:bg-bg-soft" title="Download">↓</a>
                    )}
                    <button onClick={() => deleteEntry(e.id)} className="p-1.5 rounded hover:bg-red-50 hover:text-red-700" title="Delete">×</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
