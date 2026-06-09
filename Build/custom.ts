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

  await writeCustomFile('twitter_non_ip.conf', `
# >> Twitter
DOMAIN-SUFFIX,x.com
DOMAIN-SUFFIX,t.co
DOMAIN-SUFFIX,twimg.co
DOMAIN-SUFFIX,twimg.com
DOMAIN-SUFFIX,twitpic.com
DOMAIN-SUFFIX,twitter.com
DOMAIN-SUFFIX,twitter.jp
DOMAIN-SUFFIX,vine.co
DOMAIN-SUFFIX,periscope.tv
DOMAIN-SUFFIX,pscp.tv
# fucktwitter
DOMAIN-SUFFIX,vxtwitter.com
DOMAIN-SUFFIX,fxtwitter.com
DOMAIN-SUFFIX,fixupx.com
DOMAIN-SUFFIX,fixvx.com
DOMAIN-SUFFIX,twittpr.com
DOMAIN-SUFFIX,nitter.net
`.trim());
});
