'use client';

import { useEffect, useState } from 'react';
import { NavBar } from '@/components/NavBar';
import { ToastProvider, useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase-browser';
import type { Category, CustomProduct } from '@/lib/types';

export default function ProductsPage() {
  return (
    <ToastProvider>
      <NavBar />
      <Products />
    </ToastProvider>
  );
}

function Products() {
  const toast = useToast();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<CustomProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<CustomProduct | null>(null);
  const [adding, setAdding] = useState<string | null>(null); // category_id when adding

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();
    if (!membership) { setLoading(false); return; }
    setTeamId(membership.team_id);

    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('custom_products').select('*').eq('team_id', membership.team_id).order('name')
    ]);
    setCategories(cats || []);
    setProducts(prods || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product? Saved prompts referencing it will keep working.')) return;
    const supabase = createClient();
    const { error } = await supabase.from('custom_products').delete().eq('id', id);
    if (error) { toast('Delete failed'); return; }
    toast('Deleted');
    load();
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <header className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl italic font-light">Products</h1>
          <p className="text-text-muted mt-1">Your shared catalog. Add anything Kanabco makes — sofas, tables, TV units, beds, lighting.</p>
        </div>
      </header>

      {loading && <div className="text-center py-20 text-text-muted text-sm pulse-soft">Loading…</div>}

      {!loading && categories.map(cat => {
        const catProducts = products.filter(p => p.category_id === cat.id);
        return (
          <section key={cat.id} className="mb-10">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-serif text-xl italic">{cat.name}</h2>
              <button
                onClick={() => setAdding(cat.id)}
                className="text-xs text-orange hover:underline font-medium"
              >
                + Add product
              </button>
            </div>
            {catProducts.length === 0 && adding !== cat.id && (
              <div className="text-sm text-text-faint italic py-3 px-4 bg-bg-card border border-border rounded-lg">
                Nothing here yet. Click "Add product" to start building this category.
              </div>
            )}
            <div className="space-y-2">
              {catProducts.map(p => (
                <ProductRow
                  key={p.id}
                  product={p}
                  onEdit={() => setEditingProduct(p)}
                  onDelete={() => deleteProduct(p.id)}
                />
              ))}
              {adding === cat.id && teamId && (
                <ProductForm
                  teamId={teamId}
                  categoryId={cat.id}
                  onSaved={() => { setAdding(null); load(); toast('Added'); }}
                  onCancel={() => setAdding(null)}
                />
              )}
            </div>
          </section>
        );
      })}

      {editingProduct && teamId && (
        <Modal onClose={() => setEditingProduct(null)}>
          <ProductForm
            teamId={teamId}
            categoryId={editingProduct.category_id}
            existing={editingProduct}
            onSaved={() => { setEditingProduct(null); load(); toast('Updated'); }}
            onCancel={() => setEditingProduct(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function ProductRow({ product, onEdit, onDelete }: { product: CustomProduct; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-bg-card border border-border rounded-lg p-4 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm mb-0.5">{product.name}</div>
        <div className="text-xs text-text-muted mb-2">{product.description}</div>
        <div className="text-xs text-text-faint italic leading-snug line-clamp-2">"{product.shape}"</div>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button onClick={onEdit} className="text-xs text-text-muted hover:text-text px-2 py-1 underline">Edit</button>
        <button onClick={onDelete} className="text-xs text-text-muted hover:text-red-700 px-2 py-1 underline">Delete</button>
      </div>
    </div>
  );
}

function ProductForm({
  teamId,
  categoryId,
  existing,
  onSaved,
  onCancel
}: {
  teamId: string;
  categoryId: string;
  existing?: CustomProduct;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(existing?.name || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [shape, setShape] = useState(existing?.shape || '');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim() || !shape.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      team_id: teamId,
      category_id: categoryId,
      name: name.trim(),
      description: description.trim() || name.trim(),
      shape: shape.trim(),
      created_by: user?.id || null,
      updated_at: new Date().toISOString()
    };
    const { error } = existing
      ? await supabase.from('custom_products').update(payload).eq('id', existing.id)
      : await supabase.from('custom_products').insert(payload);
    setSaving(false);
    if (error) { alert('Save failed: ' + error.message); return; }
    onSaved();
  }

  return (
    <div className="bg-bg-card border-2 border-orange/40 rounded-lg p-4 space-y-3">
      <div className="font-serif italic text-base">{existing ? 'Edit product' : 'New product'}</div>
      <div>
        <label className="block text-xs uppercase tracking-wider text-text-muted mb-1 font-medium">Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g., Floating oak TV console"
          className="input"
          autoFocus
        />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wider text-text-muted mb-1 font-medium">Short description</label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="One-line note shown in the picker"
          className="input"
        />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wider text-text-muted mb-1 font-medium">
          Shape description <span className="text-text-faint normal-case lowercase">(used in AI prompts)</span>
        </label>
        <textarea
          value={shape}
          onChange={e => setShape(e.target.value)}
          rows={3}
          placeholder='e.g., "a low wall-mounted floating TV console with a brushed oak veneer surface, matte black recessed handles, and a single slim drawer running its full length"'
          className="input resize-none"
        />
        <p className="text-[11px] text-text-faint mt-1.5 leading-snug">
          Write 1-2 sentences describing form, material, and signature details. This goes straight into Gemini prompts, so be specific and visual.
        </p>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={save} disabled={saving || !name || !shape} className="btn btn-primary flex-1">
          {saving ? 'Saving…' : existing ? 'Update' : 'Add product'}
        </button>
        <button onClick={onCancel} className="btn btn-secondary">Cancel</button>
      </div>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg-card rounded-2xl p-2 max-w-lg w-full" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
