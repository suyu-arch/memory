'use client';

import type { PersonSummary } from '@togetherly/contracts';
import { useEffect, useState } from 'react';
import { TogetherIdeas } from '@/components/together-ideas';
import { clientApi } from '@/lib/client-api';
import { demoPeople } from '@/lib/demo';

export default function TogetherPage() {
  const [people, setPeople] = useState<PersonSummary[]>(demoPeople);
  useEffect(() => { if (process.env.NEXT_PUBLIC_API_BASE_URL) void clientApi<PersonSummary[]>('/people').then(setPeople).catch(() => undefined); }, []);

  return <div className="page together-page">
    <div className="header-row together-page-header">
      <div><span className="eyebrow">OUR LITTLE LIST</span><h1 className="page-title">下次一起</h1><p className="subtle">想到什么先写下来，什么时候见面可以以后再说。</p></div>
    </div>
    <TogetherIdeas people={people} board/>
  </div>;
}
