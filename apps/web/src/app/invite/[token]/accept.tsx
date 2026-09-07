'use client';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';

export function InvitationAccept({ token }: { token: string }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [state, setState] = useState('');

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  async function sendCode() {
    if (!email.trim()) return setState('请先填写收到邀请的邮箱');
    const supabase = getSupabase();
    if (!supabase) {
      setSent(true);
      return setState('本地开发模式：可直接接受邀请');
    }
    setState('正在发送登录链接…');
    const emailRedirectTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo },
    });
    if (error) return setState(`发送失败：${error.message}`);
    setSent(true);
    setState('登录链接已发送，请打开邮件并点击链接');
  }

  async function accept() {
    setState('正在接受邀请…');
    const headers: Record<string, string> = {};
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return setState('请先通过邮件中的链接登录');
      headers.authorization = `Bearer ${data.session.access_token}`;
    } else {
      headers['x-user-id'] = `dev-${email.trim().toLowerCase()}`;
      headers['x-user-email'] = email.trim().toLowerCase();
      headers['x-user-name'] = email.trim().split('@')[0] ?? '朋友';
    }
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/v1'}/invitations/${token}/accept`, {
      method: 'POST', headers,
    });
    setState(response.ok ? '已加入这段共同经历，可以关闭这个页面了' : `无法加入：${await response.text()}`);
  }

  return <div className="form" style={{ textAlign: 'left', marginTop: 24 }}>
    {!signedIn && <div className="field"><label>收到邀请的邮箱</label><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>}
    {signedIn
      ? <button className="button orange" onClick={accept}>接受邀请</button>
      : !sent
        ? <button className="button orange" onClick={sendCode}>发送邮箱登录链接</button>
        : <button className="button secondary" onClick={() => setSent(false)}>换一个邮箱</button>}
    {state && <p className="subtle">{state}</p>}
  </div>;
}
