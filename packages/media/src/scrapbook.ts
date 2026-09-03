import type {
  DecorationLevel, ScrapbookBlock, ScrapbookDocument, ScrapbookPage, ScrapbookTemplate,
} from '@togetherly/contracts';

export interface LayoutAsset {
  id: string;
  sceneGroup: number;
  recommended: boolean;
  width: number;
  height: number;
}

export interface LayoutInput {
  story: string;
  dateLabel: string;
  locationText?: string | null;
  template: ScrapbookTemplate;
  decorationLevel: DecorationLevel;
  assets: LayoutAsset[];
}

const backgrounds: Record<ScrapbookTemplate, string[]> = {
  MAGAZINE: ['#fffdf8', '#f3f0ea'], WOOD: ['#f2e2c4', '#ead3ad'],
  FILM: ['#1e1d1b', '#2c2925'], COLLAGE: ['#fff4f2', '#f2f4ff'],
};

export function generateScrapbook(input: LayoutInput): ScrapbookDocument {
  const selected = input.assets.filter((asset) => asset.recommended);
  const assets = selected.length >= 3 ? selected : input.assets;
  const pages: ScrapbookPage[] = [];
  const firstBlocks: ScrapbookBlock[] = [
    { id: 'date', type: 'text', text: input.dateLabel, variant: 'date' },
    ...(input.locationText ? [{ id: 'location', type: 'text', text: input.locationText, variant: 'location' } as ScrapbookBlock] : []),
    { id: 'story', type: 'text', text: input.story, variant: 'story' },
  ];
  pages.push({ id: 'page-1', background: backgrounds[input.template][0]!, columns: 1, blocks: firstBlocks });
  for (let index = 0; index < assets.length; index += 4) {
    const chunk = assets.slice(index, index + 4);
    const blocks: ScrapbookBlock[] = chunk.map((asset, offset) => ({
      id: `photo-${asset.id}`,
      type: 'photo',
      assetId: asset.id,
      span: chunk.length === 1 || (offset === 0 && asset.width > asset.height * 1.25) ? 2 : 1,
      rotation: rotationFor(input.template, input.decorationLevel, index + offset),
    }));
    if (input.decorationLevel !== 'RESTRAINED') {
      blocks.push({ id: `sticker-${index}`, type: 'sticker', token: stickerFor(input.template, index) });
    }
    pages.push({
      id: `page-${pages.length + 1}`,
      background: backgrounds[input.template][pages.length % backgrounds[input.template].length]!,
      columns: 2,
      blocks,
    });
  }
  return { version: 1, template: input.template, decorationLevel: input.decorationLevel, sourceText: input.story, pages };
}

function rotationFor(template: ScrapbookTemplate, level: DecorationLevel, index: number) {
  if (template === 'MAGAZINE' || level === 'RESTRAINED') return 0;
  const magnitude = level === 'RICH' ? 2.4 : 1.2;
  return Number((((index % 3) - 1) * magnitude).toFixed(1));
}

function stickerFor(template: ScrapbookTemplate, index: number) {
  const stickers: Record<ScrapbookTemplate, string[]> = {
    MAGAZINE: ['dot', 'line'], WOOD: ['tape', 'leaf'], FILM: ['date-stamp', 'grain'], COLLAGE: ['heart', 'star', 'tape'],
  };
  const options = stickers[template];
  return options[index % options.length]!;
}
