import type { EncounterSummary, PersonSummary } from '@togetherly/contracts';

export const publicAsset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${path}`;

export const demoPhotoPool = [
  publicAsset('/demo/friends-dinner.jpg'),
  publicAsset('/demo/cinema-night.jpg'),
  publicAsset('/demo/river-walk.jpg'),
];

const personPhotoById: Record<string, string> = {
  lin: demoPhotoPool[0]!,
  jie: demoPhotoPool[1]!,
  yu: demoPhotoPool[2]!,
};

const encounterPhotoOrder: Record<string, number[]> = {
  'summer-night': [2, 0, 1],
  movie: [1, 0, 2],
  'new-year': [0, 2, 1],
};

export function personPhoto(person: PersonSummary, index = 0) {
  return person.avatarUrl || personPhotoById[person.id] || demoPhotoPool[index % demoPhotoPool.length]!;
}

export function encounterPhotos(encounter: EncounterSummary, index = 0) {
  if (encounter.photoUrls?.length) return encounter.photoUrls;
  const fallbackOrder = encounterPhotoOrder[encounter.id] ?? [index % 3, (index + 1) % 3, (index + 2) % 3];
  const photos = fallbackOrder.map((photoIndex) => demoPhotoPool[photoIndex]!).filter(Boolean);
  return encounter.coverUrl ? [encounter.coverUrl, ...photos.filter((photo) => photo !== encounter.coverUrl)] : photos;
}
