import { InvitationAccept } from './accept';
export function generateStaticParams(){return [{token:'demo'}]}
export default async function InvitePage({params}:{params:Promise<{token:string}>}){const {token}=await params;return <div className="page" style={{maxWidth:620}}><section className="panel" style={{textAlign:'center',padding:38}}><span className="brand-mark" style={{margin:'0 auto 18px'}}>拾</span><span className="eyebrow">一份私密邀请</span><h1 className="page-title">有人想和你一起保存这段回忆</h1><p className="subtle">请使用收到邀请的邮箱登录。加入后，你只能看到明确分享给你的经历。</p><InvitationAccept token={token}/></section></div>}
