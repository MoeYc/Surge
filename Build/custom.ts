import fsp from 'node:fs/promises';
import path from 'node:path';

import { PUBLIC_DIR, ROOT_DIR } from './constants/dir';
import { mkdirp } from './lib/misc';
import { task } from './trace';

export const CUSTOM_SOURCE_DIR = path.join(ROOT_DIR, 'custom');
export const CUSTOM_OUTPUT_DIR = path.join(PUBLIC_DIR, 'custom');

async function copyCustomFiles(sourceDir: string, outputDir: string): Promise<void> {
  await mkdirp(outputDir);

  const entries = await fsp.readdir(sourceDir, { withFileTypes: true });

  await Promise.all(entries.map(async (entry) => {
    const source = path.join(sourceDir, entry.name);
    const output = path.join(outputDir, entry.name);

    if (entry.isDirectory()) {
      await copyCustomFiles(source, output);
    } else if (entry.isFile() && path.extname(entry.name) === '.conf') {
      await fsp.copyFile(source, output);
    }
  }));
}

export const buildCustom = task(require.main === module, __filename)(async () => {
  await copyCustomFiles(CUSTOM_SOURCE_DIR, CUSTOM_OUTPUT_DIR);
});
