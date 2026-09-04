import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { PersonSummary } from '@togetherly/contracts';
import { PersonAvatar } from '@/components/person-avatar';
import { TogetherIdeas } from '@/components/together-ideas';
import { api } from '@/lib/api';
import { demoPeople } from '@/lib/demo';
import { personPhoto } from '@/lib/media';

export function generateStaticParams() {
  return demoPeople.map(({ id }) => ({ personId: id }));
}

export default async function PersonTogetherPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  const person = await api<PersonSummary>(`/people/${personId}`).catch(() => demoPeople.find((item) => item.id === personId) ?? demoPeople[0]!);
  const name = person.nickname ?? person.displayName;

  return <div className="page together-page person-together-page">
    <Link className="text-link together-back" href="/together"><ArrowLeft size={16}/>全部朋友</Link>
    <div className="person-together-title">
      <PersonAvatar personId={person.id} name={name} src={personPhoto(person, demoPeople.findIndex((item) => item.id === person.id))}/>
      <div><span className="eyebrow">JUST US TWO</span><h1 className="page-title">我和{name}</h1><p className="subtle">我们想一起做的事，都收在这里。</p></div>
    </div>
    <TogetherIdeas people={[person]} personId={person.id} board/>
  </div>;
}
