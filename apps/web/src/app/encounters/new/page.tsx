import { Suspense } from 'react';
import { NewEncounterForm } from './form';
export default function NewEncounterPage() {
  return <div className="page"><span className="eyebrow">新的记录</span><h1 className="page-title">这次发生了什么？</h1><p className="subtle">先把照片都倒进来，慢慢写也没关系，草稿会自动保存。</p><Suspense fallback={null}><NewEncounterForm/></Suspense></div>;
}
