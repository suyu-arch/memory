'use client';

import { Check, Copy, Mail, UserRoundCheck, X } from 'lucide-react';
import { useState } from 'react';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

export function InviteFriend({ personId, linked }: { personId: string; linked: boolean }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [message, setMessage] = useState('');

  if (linked) return <span className="editing-together"><UserRoundCheck size={17}/>共同编辑中</span>;

  async function createInvite(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setMessage('正在准备邀请…');
    if (!apiBase) {
      setInviteUrl(`${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/invite/demo/`);
      setMessage('演示邀请已生成；部署后端后会绑定到这位朋友。');
      return;
    }
    const response = await fetch(`${apiBase}/invitations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user-id': 'demo-user', 'x-user-email': 'demo@example.test', 'x-user-name': '小满' },
      body: JSON.stringify({ email: email.trim(), personId, role: 'EDITOR' }),
    });
    if (!response.ok) return setMessage('邀请暂时没有生成，请稍后再试。');
    const result = await response.json() as { acceptUrl: string };
    setInviteUrl(`${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${result.acceptUrl}`);
    setMessage('邀请链接已生成，有效期为 7 天。');
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl);
    setMessage('邀请链接已复制。');
  }

  return <div className="invite-friend">
    <button className="button secondary" type="button" onClick={() => setOpen(true)}><Mail size={17}/>邀请一起编辑</button>
    {open && <div className="invite-popover">
      <button className="invite-close" type="button" onClick={() => setOpen(false)} aria-label="关闭邀请"><X size={16}/></button>
      <strong>邀请朋友加入你们的空间</strong>
      <p>加入后，双方都能添加和修改“下次一起”。</p>
      {!inviteUrl ? <form onSubmit={createInvite}><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="朋友的邮箱" required/><button type="submit"><Mail size={15}/>生成邀请</button></form> : <div className="invite-link"><input value={inviteUrl} readOnly/><button type="button" onClick={copyInvite}><Copy size={15}/>复制</button></div>}
      {message && <small><Check size={13}/>{message}</small>}
    </div>}
  </div>;
}
