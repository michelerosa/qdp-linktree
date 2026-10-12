import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Quelli della Pizza';

export default async function OgImage() {
  const logo = await readFile(join(process.cwd(), 'assets/logo.svg'));
  const dataUrl = `data:image/svg+xml;base64,${logo.toString('base64')}`;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, background: '#FFD000', color: '#1d1d1b', fontSize: 88, fontWeight: 700 }}>
        <img src={dataUrl} width={240} height={240} />
        <div style={{ display: 'flex' }}>Quelli della Pizza</div>
      </div>
    ),
    size,
  );
}
