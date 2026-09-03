import { describe, expect, it } from 'vitest';
import { organizePhotos } from './photo-analysis.js';
import { generateScrapbook } from './scrapbook.js';

describe('photo organization', () => {
  it('keeps every photo but marks the weaker duplicate as not recommended', () => {
    const photos = organizePhotos([
      { id: 'a', sha256: 'a', perceptualHash: '0000000000000000', width: 1000, height: 800, sharpness: .8, exposure: .5, takenAt: new Date('2026-01-01T10:00:00Z') },
      { id: 'b', sha256: 'b', perceptualHash: '0000000000000001', width: 1000, height: 800, sharpness: .2, exposure: .2, takenAt: new Date('2026-01-01T10:01:00Z') },
    ]);
    expect(photos).toHaveLength(2);
    expect(photos.find((photo) => photo.id === 'a')?.recommended).toBe(true);
    expect(photos.find((photo) => photo.id === 'b')?.recommended).toBe(false);
  });
});

describe('scrapbook layout', () => {
  it('preserves the original story byte-for-byte', () => {
    const story = '这是我的原话。\n不要替我润色。';
    const layout = generateScrapbook({ story, dateLabel: '2026.08.24', template: 'WOOD', decorationLevel: 'BALANCED', assets: [] });
    expect(layout.sourceText).toBe(story);
    expect(layout.pages[0]?.blocks).toContainEqual(expect.objectContaining({ type: 'text', text: story }));
  });
});
