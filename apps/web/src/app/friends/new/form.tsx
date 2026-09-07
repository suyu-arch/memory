'use client';
import { useState } from 'react';
import { appPath, clientApi } from '@/lib/client-api';
export function NewFriendForm(){const [message,setMessage]=useState('');async function submit(data:FormData){try{await clientApi('/people',{method:'POST',body:JSON.stringify({displayName:data.get('displayName'),nickname:data.get('nickname')||undefined})});location.href=appPath('/friends/')}catch(error){setMessage(error instanceof Error?error.message:'添加失败')}}return <form className="form" action={submit}><div className="field"><label>名字</label><input name="displayName" required placeholder="朋友的名字"/></div><div className="field"><label>你习惯的称呼</label><input name="nickname" placeholder="例如：小林"/></div>{message&&<p>{message}</p>}<button className="button orange">添加朋友</button></form>}
