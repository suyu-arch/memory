import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import type { PersonSummary } from '@togetherly/contracts';
import { api } from '@/lib/api';
import { demoPeople } from '@/lib/demo';

export default async function FriendsPage() {
  const people = await api<PersonSummary[]>('/people').catch(() => demoPeople);
  return <div className="page"><div className="header-row"><div><span className="eyebrow">共同经历</span><h1 className="page-title">朋友</h1><p className="subtle">每一段关系，都有自己的时间线。</p></div><Link className="button orange" href="/friends/new"><Plus size={18}/>添加朋友</Link></div>
    <div className="panel" style={{display:'flex',gap:10,alignItems:'center',marginBottom:20}}><Search size={18} color="#8a8378"/><span className="subtle">搜索朋友、地点或共同经历</span></div>
    <div className="card-grid">{people.map((person) => <Link className="friend-card" href={`/friends/${person.id}`} key={person.id}><span className="avatar">{(person.nickname ?? person.displayName).slice(0,1)}</span><div><strong>{person.nickname ?? person.displayName}</strong><small>{person.linked ? '已共同编辑' : '还未加入'} · {person.encounterCount} 次见面</small></div></Link>)}</div>
  </div>;
}
