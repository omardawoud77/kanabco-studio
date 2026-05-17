'use client';

import { useEffect, useState } from 'react';
import { NavBar } from '@/components/NavBar';
import { ToastProvider, useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase-browser';
import type { Team, TeamMember } from '@/lib/types';

export default function TeamPage() {
  return (
    <ToastProvider>
      <NavBar />
      <TeamManager />
    </ToastProvider>
  );
}

function TeamManager() {
  const toast = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [me, setMe] = useState<{ id: string; email: string | null } | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setMe({ id: user.id, email: user.email ?? null });

    const { data: memberRow } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();
    if (!memberRow) return;

    const { data: teamData } = await supabase.from('teams').select('*').eq('id', memberRow.team_id).single();
    setTeam(teamData);

    const { data: memberList } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', memberRow.team_id)
      .order('created_at');
    setMembers(memberList || []);
  }

  useEffect(() => { load(); }, []);

  async function invite() {
    if (!team || !inviteEmail) return;
    setInviting(true);
    try {
      const supabase = createClient();
      // Look up user by email
      const { data: userLookup, error: lookupErr } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('email', inviteEmail)
        .limit(1)
        .maybeSingle();

      if (lookupErr || !userLookup) {
        toast('User not found — they must sign up first');
        setInviting(false);
        return;
      }

      const { error } = await supabase.from('team_members').insert({
        team_id: team.id,
        user_id: userLookup.user_id,
        email: inviteEmail,
        role: 'member',
      });

      if (error) {
        if (error.code === '23505') toast('Already a member');
        else toast(error.message);
        setInviting(false);
        return;
      }

      toast('Added to team');
      setInviteEmail('');
      load();
    } catch (e: any) {
      toast('Failed to invite');
      console.error(e);
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(memberId: string, userId: string) {
    if (!confirm('Remove this member?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('team_members').delete().eq('id', memberId);
    if (error) { toast(error.message); return; }
    toast('Removed');
    load();
  }

  const isOwner = me && team && team.owner_id === me.id;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <header className="mb-8">
        <h1 className="font-serif text-3xl italic font-light">Team</h1>
        <p className="text-text-muted mt-1">Members of <span className="font-medium text-text">{team?.name || '…'}</span> can see and contribute to the shared library.</p>
      </header>

      {isOwner && (
        <div className="bg-bg-card border border-border rounded-2xl p-5 mb-8">
          <div className="font-serif italic text-lg mb-3">Add a member</div>
          <p className="text-xs text-text-muted mb-4">They must have already signed up at this site. Enter their email below.</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="teammate@example.com"
              className="input flex-1"
            />
            <button onClick={invite} disabled={!inviteEmail || inviting} className="btn btn-primary">
              {inviting ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border text-xs uppercase tracking-wider text-text-muted font-medium">
          {members.length} member{members.length !== 1 ? 's' : ''}
        </div>
        <ul>
          {members.map(m => (
            <li key={m.id} className="px-5 py-4 border-b border-border last:border-0 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-bg-soft flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {m.email[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{m.email}</div>
                  <div className="text-xs text-text-muted capitalize">{m.role}</div>
                </div>
              </div>
              {isOwner && m.user_id !== me?.id && (
                <button
                  onClick={() => removeMember(m.id, m.user_id)}
                  className="text-xs text-text-muted hover:text-red-700"
                >
                  Remove
                </button>
              )}
              {m.user_id === me?.id && (
                <span className="text-xs text-orange font-medium">You</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
