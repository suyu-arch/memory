'use client';

import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import type { PersonSummary } from '@togetherly/contracts';
import { useEffect, useState } from 'react';
import { PersonAvatar } from '@/components/person-avatar';
import { TogetherIdeas } from '@/components/together-ideas';
import { clientApi } from '@/lib/client-api';
import { demoPeople } from '@/lib/demo';
import { personPhoto } from '@/lib/media';

export default function FriendsPage() {
  const [people, setPeople] = useState<PersonSummary[]>(demoPeople);
  useEffect(() => { if (process.env.NEXT_PUBLIC_API_BASE_URL) void clientApi<PersonSummary[]>('/people').then(setPeople).catch(() => undefined); }, []);
  return <div className="page friends-page"><div className="friends-doodles" aria-hidden="true"><span className="friends-doodle friends-doodle-flower">❀</span><span className="friends-doodle friends-doodle-star">✦</span><span className="friends-doodle friends-doodle-smile">◡̈</span><span className="friends-doodle friends-doodle-envelope">✉</span><span className="friends-doodle friends-doodle-moon">☾</span></div><div className="header-row"><div><span className="eyebrow">共同经历</span><h1 className="page-title">朋友</h1><p className="subtle">每一段关系，都有自己的时间线。</p></div><Link className="button orange" href="/friends/new"><Plus size={18}/>添加朋友</Link></div>
    <div className="panel" style={{display:'flex',gap:10,alignItems:'center',marginBottom:20}}><Search size={18} color="#8a8378"/><span className="subtle">搜索朋友、地点或共同经历</span></div>
    <div className="card-grid">{people.map((person, index) => <Link className="friend-card" href={`/friends/view?person=${encodeURIComponent(person.id)}`} key={person.id}><PersonAvatar personId={person.id} name={person.nickname ?? person.displayName} src={personPhoto(person, index)} className={`friend-photo-${index % 3 + 1}`}/><div><strong>{person.nickname ?? person.displayName}</strong><small>{person.linked ? '已共同编辑' : '还未加入'} · {person.encounterCount} 次见面</small></div></Link>)}</div>
    <TogetherIdeas people={people} compact/>
  </div>;
}
