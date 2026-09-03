import Link from 'next/link';
import { ArrowRight, Camera, Heart, Plus, Sparkles } from 'lucide-react';
import type { CursorPage, EncounterSummary, PersonSummary } from '@togetherly/contracts';
import { api } from '@/lib/api';
import { demoEncounters, demoPeople } from '@/lib/demo';

const publicAsset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${path}`;
const demoPhotos = [
  publicAsset('/demo/friends-dinner.jpg'),
  publicAsset('/demo/cinema-night.jpg'),
  publicAsset('/demo/river-walk.jpg'),
];

export default async function HomePage() {
  const [people, encounters] = await Promise.all([
    api<PersonSummary[]>('/people').catch(() => demoPeople),
    api<CursorPage<EncounterSummary>>('/encounters').then((page) => page.items).catch(() => demoEncounters),
  ]);
  return <div className="page">
    <section className="hero">
      <div className="hero-copy">
        <div className="hero-kicker"><span>NEW</span> 和朋友一起记录</div>
        <h1>EVERYDAY<br/><i>moments,</i><br/>WITH MY PEOPLE.</h1>
        <p>把见面的照片、原话和小情绪放进来。<br/>Memory 会帮你把零散瞬间变成一篇好看的共同日记。</p>
        <div className="hero-actions"><Link href="/encounters/new" className="button ink"><Plus size={18}/>记录这次见面</Link><Link href="/friends" className="text-link">看看朋友们 <ArrowRight size={17}/></Link></div>
        <div className="privacy-note"><Heart size={15} fill="currentColor"/> 仅你和受邀的朋友可见</div>
      </div>
      <div className="hero-preview">
        <span className="doodle doodle-star">✦</span><span className="doodle doodle-flower">❀</span><span className="doodle doodle-smile">◡̈</span>
        <div className="preview-label">FRIENDS LOG</div>
        <div className="phone-frame">
          <div className="phone-top"><b>9:41</b><span>FRIDAY</span><b>•••</b></div>
          <div className="moment-shot shot-one" style={{backgroundImage:`url(${demoPhotos[0]})`}}><span>小林</span><strong>18:30</strong><small>晚饭局 🍜</small></div>
          <div className="moment-shot shot-two" style={{backgroundImage:`url(${demoPhotos[1]})`}}><span>阿杰</span><strong>20:10</strong><small>临时去看电影</small></div>
          <div className="moment-shot shot-three" style={{backgroundImage:`url(${demoPhotos[2]})`}}><span>我们</span><strong>22:06</strong><small>走了很久才回家 ♡</small></div>
        </div>
        <span className="tape-sticker">WITH MY PEOPLE!</span>
        <span className="tiny-sticker">NO BIG<br/>MOMENT<br/>NEEDED</span>
      </div>
    </section>
    <div className="section-intro"><div><span className="eyebrow">MY PEOPLE</span><h2 className="section-title">最近想起的人</h2></div><Link href="/friends" className="round-link">查看全部 <ArrowRight size={15}/></Link></div>
    <div className="card-grid">{people.slice(0,3).map((person, index) => <Link className="friend-card" href={`/friends/${person.id}`} key={person.id}><span className={`avatar avatar-photo friend-photo-${index + 1}`} style={{backgroundImage:`url(${demoPhotos[index]})`}} aria-label={`${person.nickname ?? person.displayName}的照片`}/><div><strong>{person.nickname ?? person.displayName}</strong><small>一起记录了 {person.encounterCount} 次见面</small></div></Link>)}</div>
    <div className="section-intro"><div><span className="eyebrow">RECENT LOGS</span><h2 className="section-title">最近的共同经历</h2></div><Link href="/encounters/new" className="button pink"><Camera size={17}/>倒入照片</Link></div>
    <div className="memory-list">{encounters.slice(0,3).map((encounter, index) => <MemoryCard encounter={encounter} index={index} key={encounter.id}/>)}</div>
    <section className="upload-callout"><span className="callout-icon"><Sparkles size={22}/></span><div><strong>47 张照片还没整理？</strong><p>直接全部丢进来。我们保留每一张，只把更适合讲故事的放到前面。</p></div><span className="callout-arrow">→</span></section>
  </div>;
}

function MemoryCard({ encounter, index }: { encounter: EncounterSummary; index: number }) {
  const date = new Date(encounter.startAt);
  const memoryPhotos = [demoPhotos[2], demoPhotos[1], demoPhotos[0]];
  return <Link href={`/encounters/${encounter.id}`} className={`memory-card memory-photo-card memory-photo-${index + 1}`} style={{'--memory-image':`url(${memoryPhotos[index]})`} as React.CSSProperties}><div className="date-tile"><strong>{String(date.getDate()).padStart(2,'0')}</strong><span>{date.getFullYear()}.{String(date.getMonth()+1).padStart(2,'0')}</span></div><div><h3>{encounter.title}</h3><p>{encounter.story}</p></div><div className="memory-meta">{encounter.locationText}<br/>{encounter.photoCount} 张照片 · {encounter.participantCount} 人</div></Link>;
}
