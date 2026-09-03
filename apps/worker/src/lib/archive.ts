// CertiForge Archive Generator - ZIP export
import archiver from 'archiver';
import { PassThrough } from 'stream';

export async function createZip(
  files: Array<{ name: string; data: Buffer }>
): Promise<Buffer> {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  
  archive.on('data', (chunk) => chunks.push(chunk));
  
  for (const file of files) {
    archive.append(file.data, { name: sanitizeFilename(file.name) });
  }
  
  await archive.finalize();
  
  return Buffer.concat(chunks);
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 100);
}
