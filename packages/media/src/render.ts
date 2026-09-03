import type { ScrapbookDocument } from '@togetherly/contracts';

export function renderScrapbookSvg(document: ScrapbookDocument, assetUrls: Record<string, string>): string {
  const pageHeight = 900;
  const width = 1080;
  const height = document.pages.length * pageHeight;
  const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const pages = document.pages.map((page, pageIndex) => {
    let photoIndex = 0;
    const blocks = page.blocks.map((block) => {
      if (block.type === 'text') {
        const y = block.variant === 'date' ? 100 : block.variant === 'location' ? 160 : 260;
        const size = block.variant === 'story' ? 34 : 30;
        const lines = block.text.split(/\n/).flatMap((line) => line.match(/.{1,24}/gu) ?? ['']);
        return lines.map((line, index) => `<text x="90" y="${y + index * (size + 16)}" font-size="${size}" fill="#292725" font-family="Noto Sans CJK SC, sans-serif">${escape(line)}</text>`).join('');
      }
      if (block.type === 'photo') {
        const column = photoIndex % 2;
        const row = Math.floor(photoIndex / 2);
        photoIndex += 1;
        const x = 70 + column * 500;
        const y = 80 + row * 390;
        const photoWidth = block.span === 2 ? 940 : 440;
        const url = escape(assetUrls[block.assetId] ?? '');
        return `<g transform="rotate(${block.rotation} ${x + photoWidth / 2} ${y + 160})"><rect x="${x - 12}" y="${y - 12}" width="${photoWidth + 24}" height="344" rx="10" fill="#fff"/><image href="${url}" x="${x}" y="${y}" width="${photoWidth}" height="320" preserveAspectRatio="xMidYMid slice"/></g>`;
      }
      return `<text x="900" y="90" font-size="28" opacity=".55">${escape(block.token)}</text>`;
    }).join('');
    return `<g transform="translate(0 ${pageIndex * pageHeight})"><rect width="${width}" height="${pageHeight}" fill="${page.background}"/>${blocks}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${pages}</svg>`;
}
