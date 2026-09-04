import Link from 'next/link';
import { ArrowRight, Camera, Flower2, Heart, Mail, Plus, Smile, Sparkles, Star } from 'lucide-react';
import type { CursorPage, EncounterSummary, PersonSummary } from '@togetherly/contracts';
import { PersonAvatar } from '@/components/person-avatar';
import { PhotoSlideshow } from '@/components/photo-slideshow';
import { TogetherIdeas } from '@/components/together-ideas';
import { api } from '@/lib/api';
import { demoEncounters, demoPeople } from '@/lib/demo';
import { encounterPhotos, personPhoto } from '@/lib/media';

export default async function HomePage() {
  const [people, encounters] = await Promise.all([
    api<PersonSummary[]>('/people').catch(() => demoPeople),
    api<CursorPage<EncounterSummary>>('/encounters').then((page) => page.items).catch(() => demoEncounters),
  ]);
  const recentEncounters = encounters.slice(0, 3);
  return <div className="page">
    <section className="hero">
      <div className="hero-scene-doodles" aria-hidden="true">
        <span className="hero-scene-flower"><Flower2/></span>
        <span className="hero-scene-smile"><Smile/></span>
        <span className="hero-scene-camera"><Camera/></span>
        <span className="hero-scene-mail"><Mail/></span>
        <span className="hero-scene-star"><Star/></span>
        <span className="hero-scene-sparkles"><Sparkles/></span>
      </div>
      <div className="hero-copy">
        <div className="hero-copy-doodles" aria-hidden="true"><span className="hero-copy-sun">☼</span><span className="hero-copy-heart">♡</span><span className="hero-copy-envelope">✉</span></div>
        <div className="hero-kicker"><span>NEW</span> 和朋友一起记录</div>
        <h1>EVERYDAY<br/><i>moments,</i><br/>WITH MY PEOPLE.</h1>
        <p>把见面的照片、原话和小情绪放进来。<br/>Memory 会帮你把零散瞬间变成一篇好看的共同日记。</p>
        <div className="hero-actions"><Link href="/encounters/new" className="button ink"><Plus size={18}/>记录一段经历</Link><Link href="/friends" className="text-link">看看朋友们 <ArrowRight size={17}/></Link></div>
        <div className="privacy-note"><Heart size={15} fill="currentColor"/> 仅你和受邀的朋友可见</div>
      </div>
      <div className="hero-preview">
        <span className="doodle doodle-star">✦</span><span className="doodle doodle-flower">❀</span><span className="doodle doodle-smile">◡̈</span>
        <div className="preview-label">FRIENDS LOG</div>
        <div className="phone-frame">
          <div className="phone-top"><b>9:41</b><span>FRIDAY</span><b>•••</b></div>
          {recentEncounters.map((encounter, index) => <HeroEncounter encounter={encounter} index={index} key={encounter.id}/>)}
        </div>
        <span className="tape-sticker">WITH MY PEOPLE!</span>
        <span className="tiny-sticker">NO BIG<br/>MOMENT<br/>NEEDED</span>
      </div>
    </section>
    <div className="section-intro"><div><span className="eyebrow">MY PEOPLE</span><h2 className="section-title">最近想起的人</h2></div><Link href="/friends" className="round-link">查看全部 <ArrowRight size={15}/></Link></div>
    <div className="card-grid">{people.slice(0,3).map((person, index) => <Link className="friend-card" href={`/friends/${person.id}`} key={person.id}><PersonAvatar personId={person.id} name={person.nickname ?? person.displayName} src={personPhoto(person, index)} className={`friend-photo-${index + 1}`}/><div><strong>{person.nickname ?? person.displayName}</strong><small>一起记录了 {person.encounterCount} 次见面</small></div></Link>)}</div>
    <TogetherIdeas people={people} compact/>
    <div className="section-intro"><div><span className="eyebrow">RECENT LOGS</span><h2 className="section-title">最近的共同经历</h2></div><Link href="/encounters/new" className="button pink"><Camera size={17}/>倒入照片</Link></div>
    <div className="memory-list">{encounters.slice(0,3).map((encounter, index) => <MemoryCard encounter={encounter} index={index} key={encounter.id}/>)}</div>
  </div>;
}

function MemoryCard({ encounter, index }: { encounter: EncounterSummary; index: number }) {
  const date = new Date(encounter.startAt);
  return <Link href={`/encounters/${encounter.id}`} className={`memory-card memory-photo-card memory-photo-${index + 1}`}><PhotoSlideshow photos={encounterPhotos(encounter, index)} interval={4800 + index * 700}/><div className="date-tile"><strong>{String(date.getDate()).padStart(2,'0')}</strong><span>{date.getFullYear()}.{String(date.getMonth()+1).padStart(2,'0')}</span></div><div><h3>{encounter.title}</h3><p>{encounter.story}</p></div><div className="memory-meta">{encounter.locationText}<br/>{encounter.photoCount} 张照片 · {encounter.participantCount} 人</div></Link>;
}

function HeroEncounter({ encounter, index }: { encounter: EncounterSummary; index: number }) {
  const date = new Date(encounter.startAt);
  const person = encounter.participantNames?.join('、') || (encounter.participantCount > 2 ? '我们' : '朋友');
  return <Link href={`/encounters/${encounter.id}`} className={`moment-shot shot-${['one','two','three'][index]}`}>
    <PhotoSlideshow photos={encounterPhotos(encounter, index)} interval={3600 + index * 550}/>
    <span>{person}</span><strong>{date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}</strong><small>{encounter.title}</small>
  </Link>;
}
