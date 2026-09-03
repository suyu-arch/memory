import type { PersonSummary } from '@togetherly/contracts';
import { TogetherIdeas } from '@/components/together-ideas';
import { api } from '@/lib/api';
import { demoPeople } from '@/lib/demo';

export default async function TogetherPage() {
  const people = await api<PersonSummary[]>('/people').catch(() => demoPeople);

  return <div className="page together-page">
    <div className="header-row together-page-header">
      <div><span className="eyebrow">OUR LITTLE LIST</span><h1 className="page-title">下次一起</h1><p className="subtle">想到什么先写下来，什么时候见面可以以后再说。</p></div>
    </div>
    <TogetherIdeas people={people} board/>
  </div>;
}
