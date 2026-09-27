import fsp from 'node:fs/promises';
import path from 'node:path';

import { PUBLIC_DIR, ROOT_DIR } from './constants/dir';
import { mkdirp } from './lib/misc';
import { task } from './trace';

export const CUSTOM_SOURCE_DIR = path.join(ROOT_DIR, 'custom');
export const CUSTOM_OUTPUT_DIR = path.join(PUBLIC_DIR, 'custom');

export const buildCustom = task(require.main === module, __filename)(async () => {
  await mkdirp(CUSTOM_OUTPUT_DIR);

  const entries = await fsp.readdir(CUSTOM_SOURCE_DIR, { withFileTypes: true });
  const confFiles = entries.filter((entry) => entry.isFile() && path.extname(entry.name) === '.conf');

  await Promise.all(confFiles.map((entry) => (
    fsp.copyFile(
      path.join(CUSTOM_SOURCE_DIR, entry.name),
      path.join(CUSTOM_OUTPUT_DIR, entry.name)
    )
  )));
});
