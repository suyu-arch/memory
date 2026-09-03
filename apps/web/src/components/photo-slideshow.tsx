'use client';

import { useEffect, useState } from 'react';

type Props = {
  photos: string[];
  interval?: number;
  className?: string;
};

export function PhotoSlideshow({ photos, interval = 4200, className = '' }: Props) {
  const validPhotos = photos.filter(Boolean);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (validPhotos.length < 2) return;
    setActive(Math.floor(Math.random() * validPhotos.length));
    const timer = window.setInterval(() => {
      setActive((current) => {
        if (validPhotos.length === 2) return (current + 1) % 2;
        let next = current;
        while (next === current) next = Math.floor(Math.random() * validPhotos.length);
        return next;
      });
    }, interval);
    return () => window.clearInterval(timer);
  }, [interval, validPhotos.length]);

  return <span className={`photo-slideshow ${className}`.trim()} aria-hidden="true">
    {validPhotos.map((photo, index) => <span
      className={`photo-slide ${index === active ? 'active' : ''}`}
      style={{ backgroundImage: `url(${photo})` }}
      key={`${photo}-${index}`}
    />)}
  </span>;
}
