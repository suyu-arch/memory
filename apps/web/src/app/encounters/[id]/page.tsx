import { api } from '@/lib/api';
import { demoEncounters } from '@/lib/demo';
import { encounterPhotos } from '@/lib/media';
import { PhotoSlideshow } from '@/components/photo-slideshow';
import { BookOpen, Camera, Coffee, Heart, Images, LockKeyhole, MapPin, Moon, Star, Users } from 'lucide-react';

type Detail = (typeof demoEncounters)[number] & { moments?: Array<{id:string;startAt:string|null;title:string;body:string}>; assets?: unknown[]; reflections?: Array<{id:string;body:string;visibility:string}>; layouts?: Array<{id:string;status:string;layout?:unknown}> };

export function generateStaticParams() {
  return demoEncounters.map(({ id }) => ({ id }));
}

export default async function EncounterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const encounter = await api<Detail>(`/encounters/${id}`).catch(() => ({
    ...(demoEncounters.find((item)=>item.id===id) ?? demoEncounters[0]!),
    moments:[{id:'1',startAt:'2026-08-20T18:30:00+08:00',title:'晚饭',body:'点了常吃的菜，聊了最近各自忙的事情。'},{id:'2',startAt:'2026-08-20T21:00:00+08:00',title:'沿河散步',body:'风不大，走了很久才发现已经很晚。'}],
    assets:Array.from({length:6}),reflections:[{id:'r1',body:'很普通的一天，但回家以后觉得很安心。',visibility:'PRIVATE'}],layouts:[],
  }));
  const encounterIndex = Math.max(0, demoEncounters.findIndex((item) => item.id === encounter.id));
  const photos = encounterPhotos(encounter, encounterIndex);
  const photoCount = Math.max(6, encounter.assets?.length ?? 0);
  return <div className="page encounter-page">
    <div className="encounter-page-doodles" aria-hidden="true"><span className="encounter-doodle-camera"><Camera/></span><span className="encounter-doodle-heart"><Heart/></span><span className="encounter-doodle-coffee"><Coffee/></span><span className="encounter-doodle-moon"><Moon/></span><span className="encounter-doodle-star"><Star/></span></div>
    <div className="detail-cover"><PhotoSlideshow photos={photos} interval={5200}/><div className="detail-cover-shade"/><span className="detail-cover-sticker">MEMORY DAY ✦</span><strong className="detail-cover-caption">{encounter.story}</strong></div><div className="detail-grid"><div>
    <span className="eyebrow">{encounter.kind==='PERSONAL'?'我的经历':'共同经历'} · {new Date(encounter.startAt).toLocaleDateString('zh-CN')}</span><h1 className="page-title">{encounter.title}</h1><p className="subtle"><MapPin size={15} style={{verticalAlign:'middle'}}/> {encounter.locationText}　{encounter.kind==='PERSONAL'?<><LockKeyhole size={15} style={{verticalAlign:'middle'}}/> 仅自己可见</>:<><Users size={15} style={{verticalAlign:'middle'}}/> {encounter.participantCount} 位参与者</>}</p>
    <section className="panel encounter-story-panel"><span className="paper-tape" aria-hidden="true"/><h2 className="section-title" style={{marginTop:0}}><BookOpen size={21}/> 共同故事</h2><div className="story">{encounter.story}</div><span className="story-heart" aria-hidden="true">♡</span></section>
    <h2 className="section-title"><Coffee size={21}/> 这次做了什么</h2><section className="panel encounter-moments-panel">{encounter.moments?.map((moment)=><div className="moment" key={moment.id}><time>{moment.startAt ? new Date(moment.startAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}) : '后来'}</time><div><strong>{moment.title}</strong><p className="subtle">{moment.body}</p></div></div>)}</section>
    <h2 className="section-title"><Images size={21}/> 全部照片</h2><div className="photo-mosaic">{Array.from({length:photoCount},(_,index)=><div className="photo-placeholder encounter-photo" style={{backgroundImage:`url(${photos[index % photos.length]})`}} key={index}/>)}</div>
  </div><aside><section className="panel encounter-private-panel"><strong>你的私人感受</strong><p className="subtle"><LockKeyhole size={14}/> 只有你能看到</p><p>{encounter.reflections?.find((item)=>item.visibility==='PRIVATE')?.body ?? '还没有写下感受。'}</p></section><section className="panel encounter-ai-panel" style={{marginTop:16}}><strong>智能整理 ✦</strong><p className="subtle">系统保留了所有照片，并将相似照片折叠展示。</p><button className="button orange" style={{width:'100%',justifyContent:'center'}}>重新整理照片</button></section></aside></div></div>;
}
