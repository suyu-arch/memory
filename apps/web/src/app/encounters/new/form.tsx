'use client';
import { Camera, LoaderCircle, Sparkles } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { uploadEncounterPhotos } from '@/lib/upload';

export function NewEncounterForm() {
  const searchParams = useSearchParams();
  const personId = searchParams.get('person') ?? undefined;
  const idea = searchParams.get('idea') ?? '';
  const prefillLocation = searchParams.get('location') ?? '';
  const [files,setFiles]=useState<File[]>([]); const [saving,setSaving]=useState(false); const [message,setMessage]=useState(''); const [progress,setProgress]=useState(0);
  async function submit(formData: FormData){setSaving(true);setMessage('正在保存记录…');try{const response=await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/v1'}/encounters`,{method:'POST',headers:{'content-type':'application/json','x-user-id':'demo-user','x-user-email':'demo@example.test','x-user-name':'小满'},body:JSON.stringify({kind:'MEETING',title:formData.get('title'),story:formData.get('story'),locationText:formData.get('location')||undefined,startAt:new Date(String(formData.get('startAt'))).toISOString(),participantPersonIds:personId?[personId]:[],moments:[]})});if(!response.ok)throw new Error(await response.text());const result=await response.json();if(files.length){setMessage('照片正在断点分片上传…');await uploadEncounterPhotos(result.id,files,(uploaded,total)=>setProgress(Math.round(uploaded/total*100)));}location.href=`/encounters/${result.id}`;}catch(error){setMessage(error instanceof Error?error.message:'保存失败');setSaving(false)}}
  return <form className="form" action={submit}><div className="field"><label>标题</label><input name="title" defaultValue={idea} placeholder="例如：下班后临时见面" required/></div><div className="field"><label>时间</label><input name="startAt" type="datetime-local" required/></div><div className="field"><label>地点</label><input name="location" defaultValue={prefillLocation} placeholder="可以只写一个大概的地方"/></div><div className="field"><label>你的原话</label><textarea name="story" placeholder="不用写得漂亮，想到什么就写什么。AI 不会修改这些文字。"/></div><label className="upload-drop"><Camera size={28}/><strong style={{display:'block',margin:'8px'}}>把照片都倒进来</strong><span className="subtle">支持一次选择最多 200 张，原图都会保留</span><input hidden type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple onChange={(event)=>setFiles(Array.from(event.target.files??[]).slice(0,200))}/>{files.length>0&&<p>{files.length} 张照片已选择</p>}</label>{message&&<p style={{color:'#a33'}}>{message}{progress>0?` ${progress}%`:''}</p>}<button className="button orange" disabled={saving} type="submit">{saving?<LoaderCircle size={18}/>:<Sparkles size={18}/>}保存并帮我整理</button></form>;
}
