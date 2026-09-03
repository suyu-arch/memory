import Link from 'next/link';
import { CalendarDays, Plus } from 'lucide-react';
import type { CursorPage, EncounterSummary, PersonSummary } from '@togetherly/contracts';
import { PersonAvatar } from '@/components/person-avatar';
import { PhotoSlideshow } from '@/components/photo-slideshow';
import { TogetherIdeas } from '@/components/together-ideas';
import { InviteFriend } from '@/components/invite-friend';
import { api } from '@/lib/api';
import { demoEncounters, demoPeople } from '@/lib/demo';
import { encounterPhotos, personPhoto } from '@/lib/media';

export function generateStaticParams() {
  return demoPeople.map(({ id }) => ({ id }));
}

export default async function FriendPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await api<PersonSummary & { relationshipSince?: string }>(`/people/${id}`).catch(() => demoPeople.find((item) => item.id === id) ?? demoPeople[0]!);
  const encounters = await api<CursorPage<EncounterSummary>>(`/people/${id}/timeline`).then((page) => page.items).catch(() => demoEncounters);
  const grouped = encounters.reduce<Record<string, EncounterSummary[]>>((result, encounter) => {
    const year = String(new Date(encounter.startAt).getFullYear());
    (result[year] ??= []).push(encounter);
    return result;
  }, {});
  return <div className="page">
    <section className="profile-head"><PersonAvatar personId={person.id} name={person.nickname ?? person.displayName} src={personPhoto(person, demoPeople.findIndex((item) => item.id === person.id))} editable/><div style={{flex:1}}><span className="eyebrow">我和 TA 的共同经历</span><h1 className="page-title" style={{margin:'4px 0'}}>{person.nickname ?? person.displayName}</h1><div className="stats"><span className="stat"><strong>{person.encounterCount}</strong><span>记录的见面</span></span><span className="stat"><strong>{person.firstEncounterAt ? new Date(person.firstEncounterAt).getFullYear() : '—'}</strong><span>第一次记录</span></span><span className="stat"><strong>{person.lastEncounterAt ? Math.max(0,Math.floor((Date.now()-new Date(person.lastEncounterAt).getTime())/86400000)) : '—'}</strong><span>距上次见面/天</span></span></div></div><div className="profile-actions"><Link className="button orange" href={`/encounters/new?person=${id}`}><Plus size={18}/>记录一次见面</Link><InviteFriend personId={person.id} linked={person.linked}/></div></section>
    <TogetherIdeas people={[person]} personId={person.id}/>
    <div className="header-row" style={{marginTop:28}}><div className="toggle"><button className="active">时间线</button><button><CalendarDays size={14}/> 日历</button></div><select className="button secondary" defaultValue="all"><option value="all">全部年份</option>{Object.keys(grouped).sort().reverse().map((year)=><option key={year}>{year}</option>)}</select></div>
    {Object.entries(grouped).sort(([a],[b])=>Number(b)-Number(a)).map(([year,items]) => <section key={year}><h2 className="year-label">{year}</h2><div className="timeline">{items?.map((encounter, index) => <Link href={`/encounters/${encounter.id}`} className="memory-card memory-photo-card" key={encounter.id}><PhotoSlideshow photos={encounterPhotos(encounter, index)} interval={4600 + index * 650}/><div className="date-tile"><strong>{String(new Date(encounter.startAt).getDate()).padStart(2,'0')}</strong><span>{String(new Date(encounter.startAt).getMonth()+1).padStart(2,'0')}月</span></div><div><h3>{encounter.title}</h3><p>{encounter.story}</p></div><div className="memory-meta">{encounter.locationText}<br/>{encounter.photoCount} 张照片</div></Link>)}</div></section>)}
  </div>;
}
