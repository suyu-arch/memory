'use client';

import { ArrowRight, CalendarDays, Camera, Check, ChevronDown, Lightbulb, MapPin, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { PersonSummary, TogetherIdea, TogetherIdeaStatus } from '@togetherly/contracts';
import { demoTogetherIdeas } from '@/lib/demo';
import { personPhoto } from '@/lib/media';
import { PersonAvatar } from './person-avatar';

const storageKey = 'memory:together-ideas';
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

type Props = {
  people: PersonSummary[];
  personId?: string;
  compact?: boolean;
  board?: boolean;
};

type Draft = {
  id?: string;
  personId: string;
  content: string;
  plannedAt: string;
  locationText: string;
  note: string;
};

const emptyDraft = (personId = ''): Draft => ({ personId, content: '', plannedAt: '', locationText: '', note: '' });

export function TogetherIdeas({ people, personId, compact = false, board = false }: Props) {
  const [ideas, setIdeas] = useState<TogetherIdea[]>([]);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [statusFilter, setStatusFilter] = useState<TogetherIdeaStatus>('IDEA');

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    const localIdeas = stored ? JSON.parse(stored) as TogetherIdea[] : demoTogetherIdeas;
    setIdeas(localIdeas);
    setReady(true);

    if (apiBase) {
      fetch(`${apiBase}/together-ideas${personId ? `?personId=${personId}` : ''}`, { headers: authHeaders() })
        .then((response) => response.ok ? response.json() as Promise<TogetherIdea[]> : Promise.reject())
        .then((remoteIdeas) => { setIdeas(remoteIdeas); localStorage.setItem(storageKey, JSON.stringify(remoteIdeas)); })
        .catch(() => undefined);
    }
  }, [personId]);

  const scopedIdeas = useMemo(() => ideas
    .filter((idea) => !personId || idea.personId === personId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [ideas, personId]);
  const visibleIdeas = useMemo(() => scopedIdeas
    .filter((idea) => board ? idea.status === statusFilter : idea.status !== 'DONE'), [board, scopedIdeas, statusFilter]);

  function saveLocal(nextIdeas: TogetherIdea[]) {
    setIdeas(nextIdeas);
    localStorage.setItem(storageKey, JSON.stringify(nextIdeas));
    window.dispatchEvent(new CustomEvent('memory-together-ideas-change'));
  }

  async function saveDraft(event: React.FormEvent) {
    event.preventDefault();
    if (!editing?.content.trim() || !editing.personId) return;
    const person = people.find((item) => item.id === editing.personId) ?? people[0];
    if (!person) return;
    const now = new Date().toISOString();
    const current = editing.id ? ideas.find((idea) => idea.id === editing.id) : undefined;
    const next: TogetherIdea = {
      id: current?.id ?? `idea-${Date.now()}`,
      personId: person.id,
      personName: person.nickname ?? person.displayName,
      personAvatarUrl: personPhoto(person, people.indexOf(person)),
      content: editing.content.trim(),
      status: current?.status ?? (editing.plannedAt || editing.locationText ? 'PLANNING' : 'IDEA'),
      proposedBy: current?.proposedBy ?? '我',
      plannedAt: editing.plannedAt ? new Date(editing.plannedAt).toISOString() : null,
      locationText: editing.locationText.trim() || null,
      note: editing.note.trim() || null,
      encounterId: current?.encounterId ?? null,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    };
    saveLocal(current ? ideas.map((idea) => idea.id === next.id ? next : idea) : [next, ...ideas]);
    setEditing(null);

    if (apiBase) {
      const url = current ? `${apiBase}/together-ideas/${current.id}` : `${apiBase}/together-ideas`;
      const body = current ? { content: next.content, plannedAt: next.plannedAt, locationText: next.locationText, note: next.note } : { personId: next.personId, content: next.content, plannedAt: next.plannedAt ?? undefined, locationText: next.locationText ?? undefined, note: next.note ?? undefined };
      fetch(url, { method: current ? 'PATCH' : 'POST', headers: authHeaders(true), body: JSON.stringify(body) }).catch(() => undefined);
    }
  }

  function updateStatus(idea: TogetherIdea, status: TogetherIdeaStatus) {
    saveLocal(ideas.map((item) => item.id === idea.id ? { ...item, status, updatedAt: new Date().toISOString() } : item));
    if (apiBase) fetch(`${apiBase}/together-ideas/${idea.id}`, { method: 'PATCH', headers: authHeaders(true), body: JSON.stringify({ status }) }).catch(() => undefined);
  }

  function removeIdea(idea: TogetherIdea) {
    if (!window.confirm(`删除“${idea.content}”吗？`)) return;
    saveLocal(ideas.filter((item) => item.id !== idea.id));
    if (apiBase) fetch(`${apiBase}/together-ideas/${idea.id}`, { method: 'DELETE', headers: authHeaders() }).catch(() => undefined);
  }

  if (!ready) return <div className="ideas-loading">正在翻找你们的小念头…</div>;

  return <section className={`together-ideas ${compact ? 'compact' : ''} ${board ? 'ideas-board' : ''}`}>
    <div className="ideas-heading">
      <div><span className="eyebrow">NEXT TIME TOGETHER</span><h2 className="section-title">{board ? '我们的清单' : personId ? '我们下次一起' : '下次一起'}</h2></div>
      <div className="ideas-heading-actions">
        {compact && <Link className="round-link ideas-view-all" href="/together">查看全部 <ArrowRight size={15}/></Link>}
        <button className="round-link ideas-add" type="button" onClick={() => setEditing(emptyDraft(personId ?? people[0]?.id))}><Plus size={16}/>记一个想法</button>
      </div>
    </div>

    {editing && <IdeaForm draft={editing} people={people} lockPerson={Boolean(personId)} onChange={setEditing} onCancel={() => setEditing(null)} onSubmit={saveDraft}/>} 

    {board && <div className="idea-status-tabs" aria-label="筛选下次一起">
      {(['IDEA', 'PLANNING', 'DONE'] as TogetherIdeaStatus[]).map((status) => <button className={statusFilter === status ? 'active' : ''} type="button" onClick={() => setStatusFilter(status)} key={status}><span>{statusLabel(status)}</span><b>{scopedIdeas.filter((idea) => idea.status === status).length}</b></button>)}
    </div>}

    <div className="idea-list">
      {visibleIdeas.slice(0, compact ? 3 : undefined).map((idea, index) => {
        const person = people.find((item) => item.id === idea.personId);
        return <article className={`idea-card idea-${idea.status.toLowerCase()}`} key={idea.id}>
          <Link className="idea-card-link" href={`/together/${idea.personId}`} aria-label={`查看我和${idea.personName}的下次一起清单`}>
            {person ? <PersonAvatar personId={person.id} name={idea.personName} src={personPhoto(person, index)} className={`friend-photo-${index % 3 + 1}`}/> : <span className="idea-bulb"><Lightbulb size={21}/></span>}
            <div className="idea-copy">
              <div className="idea-meta"><span>{idea.personName}</span><small>{idea.proposedBy}提出 · {statusLabel(idea.status)}</small></div>
              <strong>{idea.content}</strong>
              {(idea.plannedAt || idea.locationText) && <div className="idea-details">{idea.plannedAt && <span><CalendarDays size={13}/>{formatPlanDate(idea.plannedAt)}</span>}{idea.locationText && <span><MapPin size={13}/>{idea.locationText}</span>}</div>}
              {idea.note && <p>{idea.note}</p>}
            </div>
          </Link>
          <div className="idea-actions">
            <button title="编辑" type="button" onClick={() => setEditing({ id: idea.id, personId: idea.personId, content: idea.content, plannedAt: idea.plannedAt ? toLocalInput(idea.plannedAt) : '', locationText: idea.locationText ?? '', note: idea.note ?? '' })}><Pencil size={15}/></button>
            {idea.status === 'IDEA' && <button title="开始安排" type="button" onClick={() => updateStatus(idea, 'PLANNING')}><CalendarDays size={15}/></button>}
            {idea.status === 'PLANNING' && <><Link title="记录这次见面" href={`/encounters/new?person=${idea.personId}&idea=${encodeURIComponent(idea.content)}${idea.locationText ? `&location=${encodeURIComponent(idea.locationText)}` : ''}`}><Camera size={15}/></Link><button title="标记完成" type="button" onClick={() => updateStatus(idea, 'DONE')}><Check size={15}/></button></>}
            {idea.status === 'DONE' && <button title="重新放回想做" type="button" onClick={() => updateStatus(idea, 'IDEA')}><RotateCcw size={15}/></button>}
            <button title="删除" type="button" onClick={() => removeIdea(idea)}><Trash2 size={15}/></button>
          </div>
        </article>;
      })}
      {!visibleIdeas.length && <button className="idea-empty" type="button" onClick={() => setEditing(emptyDraft(personId ?? people[0]?.id))}><Lightbulb size={25}/><span><strong>{board ? emptyTitle(statusFilter) : '最近想和 TA 做什么？'}</strong><small>{board && statusFilter === 'DONE' ? '完成一件事后，它会留在这里。' : '先记下一句话，时间地点以后再说。'}</small></span></button>}
    </div>
  </section>;
}

function IdeaForm({ draft, people, lockPerson, onChange, onCancel, onSubmit }: { draft: Draft; people: PersonSummary[]; lockPerson: boolean; onChange: (draft: Draft) => void; onCancel: () => void; onSubmit: (event: React.FormEvent) => void }) {
  return <form className="idea-form" onSubmit={onSubmit}>
    <div className="idea-form-main">
      {!lockPerson && <select aria-label="选择朋友" value={draft.personId} onChange={(event) => onChange({ ...draft, personId: event.target.value })}>{people.map((person) => <option value={person.id} key={person.id}>{person.nickname ?? person.displayName}</option>)}</select>}
      <input autoFocus aria-label="想一起做什么" value={draft.content} onChange={(event) => onChange({ ...draft, content: event.target.value })} placeholder="例如：去吃收藏很久的云南菜" maxLength={240}/>
      <button className="idea-save" type="submit"><Check size={17}/>{draft.id ? '保存' : '记下来'}</button>
      <button className="idea-cancel" type="button" onClick={onCancel} aria-label="取消"><X size={17}/></button>
    </div>
    <details className="idea-more" open={Boolean(draft.plannedAt || draft.locationText || draft.note)}><summary><ChevronDown size={14}/>时间地点可以以后再说</summary><div className="idea-optional"><input aria-label="大概时间" type="datetime-local" value={draft.plannedAt} onChange={(event) => onChange({ ...draft, plannedAt: event.target.value })}/><input aria-label="大概地点" value={draft.locationText} onChange={(event) => onChange({ ...draft, locationText: event.target.value })} placeholder="大概地点（可选）"/><textarea aria-label="补充说明" value={draft.note} onChange={(event) => onChange({ ...draft, note: event.target.value })} placeholder="还有什么想补充的？（可选）"/></div></details>
  </form>;
}

function authHeaders(json = false) {
  const headers: Record<string, string> = { 'x-user-id': 'demo-user', 'x-user-email': 'demo@example.test', 'x-user-name': '小满' };
  if (json) headers['content-type'] = 'application/json';
  return headers;
}

function formatPlanDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function toLocalInput(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function statusLabel(status: TogetherIdeaStatus) {
  return status === 'IDEA' ? '想做' : status === 'PLANNING' ? '安排中' : '已完成';
}

function emptyTitle(status: TogetherIdeaStatus) {
  return status === 'IDEA' ? '还没有记下想做的事' : status === 'PLANNING' ? '暂时没有安排中的事' : '还没有完成的共同计划';
}
