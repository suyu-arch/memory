'use client';

import { BookOpen, Coffee, Images, LockKeyhole, MapPin, Users } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { clientApi } from '@/lib/client-api';

type Detail = { id:string; kind:'PERSONAL'|'MEETING'; title:string; story:string; locationText:string|null; startAt:string; participants:Array<{id:string}>; moments:Array<{id:string;startAt:string|null;title:string;body:string}>; assets:Array<{id:string;state:string}>; reflections:Array<{id:string;body:string;visibility:string}> };

export default function EncounterViewPage() { return <Suspense fallback={null}><EncounterView/></Suspense>; }

function EncounterView() {
  const id = useSearchParams().get('id') ?? '';
  const [encounter, setEncounter] = useState<Detail | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!id) return setError('缺少经历编号');
    void clientApi<Detail>(`/encounters/${id}`).then(async (next) => {
      setEncounter(next);
      const urls = await Promise.all(next.assets.filter((asset) => asset.state === 'READY').map((asset) => clientApi<{url:string}>(`/uploads/assets/${asset.id}/url?variant=thumbnail`).then((result) => result.url).catch(() => null)));
      setPhotos(urls.filter((url): url is string => Boolean(url)));
    }).catch((reason) => setError(reason instanceof Error ? reason.message : '读取失败'));
  }, [id]);
  if (error) return <div className="page"><div className="panel">{error}</div></div>;
  if (!encounter) return <div className="page"><div className="panel">正在读取这段经历…</div></div>;
  return <div className="page encounter-page"><span className="eyebrow">{encounter.kind==='PERSONAL'?'我的经历':'共同经历'} · {new Date(encounter.startAt).toLocaleDateString('zh-CN')}</span><h1 className="page-title">{encounter.title}</h1><p className="subtle"><MapPin size={15} style={{verticalAlign:'middle'}}/> {encounter.locationText || '没有记录地点'}　{encounter.kind==='PERSONAL'?<><LockKeyhole size={15}/> 仅自己可见</>:<><Users size={15}/> {encounter.participants.length} 位参与者</>}</p>
    <section className="panel encounter-story-panel"><h2 className="section-title"><BookOpen size={21}/> 原话</h2><div className="story">{encounter.story}</div></section>
    <h2 className="section-title"><Coffee size={21}/> 这次做了什么</h2><section className="panel encounter-moments-panel">{encounter.moments.map((moment)=><div className="moment" key={moment.id}><time>{moment.startAt?new Date(moment.startAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):'后来'}</time><div><strong>{moment.title}</strong><p className="subtle">{moment.body}</p></div></div>)}</section>
    {photos.length>0&&<><h2 className="section-title"><Images size={21}/> 全部照片</h2><div className="photo-mosaic">{photos.map((url)=><div className="photo-placeholder encounter-photo" style={{backgroundImage:`url(${url})`}} key={url}/>)}</div></>}
    <section className="panel encounter-private-panel" style={{marginTop:24}}><strong>你的私人感受</strong><p>{encounter.reflections.find((item)=>item.visibility==='PRIVATE')?.body ?? '还没有写下感受。'}</p></section>
  </div>;
}
