'use client';
import { createClient } from '@supabase/supabase-js';
import { useState } from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function InvitationAccept({ token }: { token: string }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [state, setState] = useState('');

  async function sendCode() {
    if (!email.trim()) return setState('请先填写收到邀请的邮箱');
    if (!supabaseUrl || !supabaseKey) {
      setSent(true);
      return setState('本地开发模式：可直接接受邀请');
    }
    setState('正在发送验证码…');
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    if (error) return setState(`发送失败：${error.message}`);
    setSent(true);
    setState('验证码已发送，请检查邮箱');
  }

  async function accept() {
    setState('正在验证并接受邀请…');
    const headers: Record<string, string> = {};
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
      if (error || !data.session) return setState(`验证失败：${error?.message ?? '没有登录会话'}`);
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
    <div className="field"><label>收到邀请的邮箱</label><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
    {!sent
      ? <button className="button orange" onClick={sendCode}>发送邮箱验证码</button>
      : <><div className="field"><label>邮箱验证码</label><input inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value)} placeholder="本地开发可留空" /></div><button className="button orange" onClick={accept}>验证并接受邀请</button></>}
    {state && <p className="subtle">{state}</p>}
  </div>;
}
