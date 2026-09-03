import { api } from '@/lib/api';
import { demoEncounters } from '@/lib/demo';
import { BookOpen, Images, LockKeyhole, MapPin, Sparkles, Users } from 'lucide-react';

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
  return <div className="page"><div className="detail-cover"/><div className="detail-grid"><div>
    <span className="eyebrow">共同经历 · {new Date(encounter.startAt).toLocaleDateString('zh-CN')}</span><h1 className="page-title">{encounter.title}</h1><p className="subtle"><MapPin size={15} style={{verticalAlign:'middle'}}/> {encounter.locationText}　<Users size={15} style={{verticalAlign:'middle'}}/> {encounter.participantCount} 位参与者</p>
    <section className="panel"><h2 className="section-title" style={{marginTop:0}}><BookOpen size={21}/> 共同故事</h2><div className="story">{encounter.story}</div></section>
    <h2 className="section-title">这次做了什么</h2><section className="panel">{encounter.moments?.map((moment)=><div className="moment" key={moment.id}><time>{moment.startAt ? new Date(moment.startAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}) : '后来'}</time><div><strong>{moment.title}</strong><p className="subtle">{moment.body}</p></div></div>)}</section>
    <h2 className="section-title"><Images size={21}/> 全部照片</h2><div className="photo-mosaic">{(encounter.assets ?? []).map((_,index)=><div className="photo-placeholder" key={index}/>)}</div>
    <h2 className="section-title"><Sparkles size={21}/> 手帐模式</h2><section className="scrapbook"><span className="eyebrow">Memory 手帐</span><h2 style={{fontFamily:'serif',fontSize:30}}>{encounter.title}</h2><p className="story">{encounter.story}</p><div className="scrapbook-photos"><div className="scrap-photo"/><div className="scrap-photo"/></div></section>
  </div><aside><section className="panel"><strong>你的私人感受</strong><p className="subtle"><LockKeyhole size={14}/> 只有你能看到</p><p>{encounter.reflections?.find((item)=>item.visibility==='PRIVATE')?.body ?? '还没有写下感受。'}</p></section><section className="panel" style={{marginTop:16}}><strong>智能整理</strong><p className="subtle">系统保留了所有照片，并将相似照片折叠展示。</p><button className="button orange" style={{width:'100%',justifyContent:'center'}}>重新生成手帐</button></section></aside></div></div>;
}
