import path from 'node:path';

import { PUBLIC_DIR } from './constants/dir';
import { mkdirp, writeFile } from './lib/misc';
import { task } from './trace';

export const CUSTOM_OUTPUT_DIR = path.join(PUBLIC_DIR, 'custom');

export function writeCustomFile(filename: string, content: NodeJS.TypedArray | string) {
  return writeFile(path.join(CUSTOM_OUTPUT_DIR, filename), content);
}

export const buildCustom = task(require.main === module, __filename)(async () => {
  await mkdirp(CUSTOM_OUTPUT_DIR);

  await writeCustomFile('apple_push.conf', `
DOMAIN,identity.apple.com
DOMAIN-SUFFIX,akadns.net
DOMAIN-SUFFIX,push.apple.com
DOMAIN-KEYWORD,apple.com.edgekey.net
IP-CIDR,17.188.128.0/18,no-resolve
IP-CIDR,17.188.20.0/23,no-resolve
IP-CIDR,17.249.0.0/16,no-resolve
IP-CIDR,17.252.0.0/16,no-resolve
IP-CIDR,17.57.144.0/22,no-resolve
IP-CIDR6,2403:300:a42::/48,no-resolve
IP-CIDR6,2403:300:a51::/48,no-resolve
IP-CIDR6,2620:149:a44::/48,no-resolve
IP-CIDR6,2a01:b740:a42::/48,no-resolve
`.trim());
});
