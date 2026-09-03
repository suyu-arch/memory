'use client';

import { Camera } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const avatarKey = (personId: string) => `memory:avatar:${personId}`;

type Props = {
  personId: string;
  name: string;
  src: string;
  editable?: boolean;
  className?: string;
};

export function PersonAvatar({ personId, name, src, editable = false, className = '' }: Props) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(avatarKey(personId));
    if (stored) setCurrentSrc(stored);
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ personId: string; src: string }>).detail;
      if (detail?.personId === personId) setCurrentSrc(detail.src);
    };
    window.addEventListener('memory-avatar-change', sync);
    return () => window.removeEventListener('memory-avatar-change', sync);
  }, [personId]);

  async function choosePhoto(file?: File) {
    if (!file) return;
    const nextSrc = await resizeAvatar(file);
    localStorage.setItem(avatarKey(personId), nextSrc);
    setCurrentSrc(nextSrc);
    window.dispatchEvent(new CustomEvent('memory-avatar-change', { detail: { personId, src: nextSrc } }));

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/v1'}/people/${personId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-user-id': 'demo-user', 'x-user-email': 'demo@example.test', 'x-user-name': '小满' },
      body: JSON.stringify({ avatarUrl: nextSrc }),
    }).catch(() => undefined);
  }

  const avatar = <span
    className={`avatar avatar-photo ${editable ? 'avatar-editable' : ''} ${className}`.trim()}
    style={{ backgroundImage: `url(${currentSrc})` }}
    role="img"
    aria-label={`${name}的照片`}
  >{editable && <span className="avatar-edit-icon"><Camera size={15}/></span>}</span>;

  if (!editable) return avatar;
  return <button className="avatar-picker" type="button" onClick={() => inputRef.current?.click()} aria-label={`更换${name}的头像`}>
    {avatar}
    <span className="avatar-picker-label">点击更换照片</span>
    <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => choosePhoto(event.target.files?.[0])}/>
  </button>;
}

function resizeAvatar(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('无法读取这张照片'));
      image.onload = () => {
        const size = Math.min(image.naturalWidth, image.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 480;
        const context = canvas.getContext('2d');
        if (!context) return reject(new Error('无法处理这张照片'));
        context.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, 480, 480);
        resolve(canvas.toDataURL('image/jpeg', .84));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
