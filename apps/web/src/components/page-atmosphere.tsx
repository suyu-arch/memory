'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Camera,
  CheckCircle2,
  Coffee,
  Flower2,
  Heart,
  Lightbulb,
  LockKeyhole,
  Mail,
  MapPin,
  Moon,
  Sparkles,
  Star,
} from 'lucide-react';
import { usePathname } from 'next/navigation';

type Atmosphere = {
  tone: 'home' | 'friends' | 'record' | 'memory' | 'together' | 'me' | 'invite';
  icons: [LucideIcon, LucideIcon, LucideIcon];
};

function atmosphereFor(pathname: string): Atmosphere {
  if (pathname === '/') return { tone: 'home', icons: [Sparkles, Heart, Star] };
  if (pathname === '/encounters/new') return { tone: 'record', icons: [Coffee, Heart, Sparkles] };
  if (pathname.startsWith('/encounters')) return { tone: 'memory', icons: [Camera, Star, MapPin] };
  if (pathname.startsWith('/friends')) return { tone: 'friends', icons: [Flower2, Mail, Heart] };
  if (pathname.startsWith('/together')) return { tone: 'together', icons: [Lightbulb, Heart, CheckCircle2] };
  if (pathname.startsWith('/invite')) return { tone: 'invite', icons: [Mail, Heart, Sparkles] };
  return { tone: 'me', icons: [Moon, LockKeyhole, Sparkles] };
}

export function PageAtmosphere() {
  const pathname = usePathname();
  const { tone, icons } = atmosphereFor(pathname);

  return (
    <div className={`page-atmosphere atmosphere-${tone}`} aria-hidden="true">
      <span className="atmosphere-blob atmosphere-blob-one" />
      <span className="atmosphere-blob atmosphere-blob-two" />
      {icons.map((Icon, index) => (
        <span className={`atmosphere-mark atmosphere-mark-${index + 1}`} key={`${tone}-${index}`}>
          <Icon strokeWidth={2.4} />
        </span>
      ))}
      <span className="atmosphere-sprinkle atmosphere-sprinkle-one">· · ·</span>
      <span className="atmosphere-sprinkle atmosphere-sprinkle-two">✦</span>
    </div>
  );
}
