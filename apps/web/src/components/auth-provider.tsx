'use client';

import type { Session } from '@supabase/supabase-js';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase';

type AuthContextValue = { session: Session | null; accessToken: string | null; signOut: () => Promise<void> };
const AuthContext = createContext<AuthContextValue>({ session: null, accessToken: null, signOut: async () => undefined });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setReady(true); });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    accessToken: session?.access_token ?? null,
    signOut: async () => { if (supabase) await supabase.auth.signOut(); },
  }), [session, supabase]);

  if (!ready) return <main className="auth-screen"><div className="panel auth-card">正在打开你的 Memory…</div></main>;
  if (supabase && !session && !pathname.startsWith('/invite/')) return <AuthScreen/>;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }

function AuthScreen() {
  const supabase = getSupabase();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) return setMessage(error.message);
    setSent(true);
    setMessage('验证码已经发到你的邮箱。');
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setMessage(error.message);
  }

  return <main className="auth-screen"><section className="panel auth-card">
    <span className="eyebrow">MEMORY SYNC</span><h1 className="page-title">登录你的记忆</h1>
    <p className="subtle">使用同一个邮箱登录，即可在手机和电脑间同步。</p>
    {!sent ? <form className="form" onSubmit={sendCode}><div className="field"><label>邮箱</label><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required/></div><button className="button orange" disabled={busy}>{busy ? '发送中…' : '发送验证码'}</button></form>
      : <form className="form" onSubmit={verifyCode}><div className="field"><label>6 位验证码</label><input inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" required/></div><button className="button orange" disabled={busy}>{busy ? '验证中…' : '登录'}</button><button className="button secondary" type="button" onClick={() => { setSent(false); setCode(''); }}>换一个邮箱</button></form>}
    {message && <p className="subtle">{message}</p>}
  </section></main>;
}
