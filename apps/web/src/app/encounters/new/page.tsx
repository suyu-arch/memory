import { Suspense } from 'react';
import type { PersonSummary } from '@togetherly/contracts';
import { api } from '@/lib/api';
import { demoPeople } from '@/lib/demo';
import { NewEncounterForm } from './form';
export default async function NewEncounterPage() {
  const people = await api<PersonSummary[]>('/people').catch(() => demoPeople);
  return <div className="page"><span className="eyebrow">新的记录</span><h1 className="page-title">这次发生了什么？</h1><p className="subtle">一个人的经历，或和朋友的见面，都值得被留下。</p><Suspense fallback={null}><NewEncounterForm people={people}/></Suspense></div>;
}
