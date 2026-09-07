'use client';

import type { CursorPage, EncounterSummary, PersonSummary } from '@togetherly/contracts';
import { CalendarDays, Plus } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { InviteFriend } from '@/components/invite-friend';
import { PersonAvatar } from '@/components/person-avatar';
import { PhotoSlideshow } from '@/components/photo-slideshow';
import { TogetherIdeas } from '@/components/together-ideas';
import { clientApi } from '@/lib/client-api';
import { demoEncounters, demoPeople } from '@/lib/demo';
import { encounterPhotos, personPhoto } from '@/lib/media';

export default function FriendViewPage() { return <Suspense fallback={null}><FriendView/></Suspense>; }

function FriendView() {
  const id = useSearchParams().get('person') ?? '';
  const [person, setPerson] = useState<PersonSummary>(() => demoPeople.find((item) => item.id === id) ?? demoPeople[0]!);
  const [encounters, setEncounters] = useState<EncounterSummary[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!id) return setError('缺少朋友编号');
    void Promise.all([clientApi<PersonSummary>(`/people/${id}`), clientApi<CursorPage<EncounterSummary>>(`/people/${id}/timeline`)])
      .then(([nextPerson, page]) => { setPerson(nextPerson); setEncounters(page.items); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : '读取失败'));
  }, [id]);
  const grouped = useMemo(() => encounters.reduce<Record<string, EncounterSummary[]>>((result, encounter) => {
    (result[String(new Date(encounter.startAt).getFullYear())] ??= []).push(encounter); return result;
  }, {}), [encounters]);
  if (error) return <div className="page"><div className="panel">{error}</div></div>;
  return <div className="page">
    <section className="profile-head"><PersonAvatar personId={person.id} name={person.nickname ?? person.displayName} src={personPhoto(person)} editable/><div style={{flex:1}}><span className="eyebrow">我和 TA 的共同经历</span><h1 className="page-title">{person.nickname ?? person.displayName}</h1><div className="stats"><span className="stat"><strong>{person.encounterCount}</strong><span>记录的见面</span></span><span className="stat"><strong>{person.firstEncounterAt ? new Date(person.firstEncounterAt).getFullYear() : '—'}</strong><span>第一次记录</span></span></div></div><div className="profile-actions"><Link className="button orange" href={`/encounters/new?person=${encodeURIComponent(id)}`}><Plus size={18}/>记录一次见面</Link><InviteFriend personId={person.id} linked={person.linked}/></div></section>
    <TogetherIdeas people={[person]} personId={person.id}/>
    <div className="header-row" style={{marginTop:28}}><div className="toggle"><button className="active">时间线</button><button><CalendarDays size={14}/> 日历</button></div></div>
    {Object.entries(grouped).sort(([a],[b])=>Number(b)-Number(a)).map(([year,items]) => <section key={year}><h2 className="year-label">{year}</h2><div className="timeline">{items.map((encounter,index)=><Link href={`/encounters/view?id=${encodeURIComponent(encounter.id)}`} className="memory-card memory-photo-card" key={encounter.id}><PhotoSlideshow photos={encounterPhotos(encounter,index)}/><div className="date-tile"><strong>{String(new Date(encounter.startAt).getDate()).padStart(2,'0')}</strong><span>{String(new Date(encounter.startAt).getMonth()+1).padStart(2,'0')}月</span></div><div><h3>{encounter.title}</h3><p>{encounter.story}</p></div></Link>)}</div></section>)}
  </div>;
}
