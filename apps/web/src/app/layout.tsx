import type { Metadata } from 'next';
import Link from 'next/link';
import { House, Plus, Settings, Sparkles, Users } from 'lucide-react';
import './globals.css';

export const metadata: Metadata = { title: 'Memory · 共同经历', description: '把照片倒进来，让相遇自己长成故事。' };

const nav = [
  { href: '/', label: '首页', icon: House },
  { href: '/friends', label: '朋友', icon: Users },
  { href: '/encounters/new', label: '记录', icon: Plus, primary: true },
  { href: '/me', label: '我的', icon: Settings },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/"><span className="brand-mark"><Sparkles size={21}/></span><span>MEMORY</span></Link>
        <nav>{nav.map(({ href, label, icon: Icon, primary }) => <Link key={href} href={href} className={primary ? 'nav-item nav-primary' : 'nav-item'}><Icon size={20}/><span>{label}</span></Link>)}</nav>
        <div className="sidebar-note"><span>✦ TODAY&apos;S NOTE</span><small>今天也值得被记住</small></div>
      </aside>
      <main className="main-content">{children}</main>
      <nav className="bottom-nav">{nav.map(({ href, label, icon: Icon, primary }) => <Link key={href} href={href} className={primary ? 'bottom-item bottom-primary' : 'bottom-item'}><Icon size={21}/><span>{label}</span></Link>)}</nav>
    </div>
  </body></html>;
}
