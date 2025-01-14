// @ts-check

import * as path from 'node:path';
import { readFileByLine } from './lib/fetch-text-by-line';
import { processLine } from './lib/process-line';
import type { Span } from './trace';
import { task } from './trace';
import { SHARED_DESCRIPTION } from './constants/description';
import { fdir as Fdir } from 'fdir';
import { appendArrayInPlace } from './lib/append-array-in-place';
import { SOURCE_DIR } from './constants/dir';
import { DomainsetOutput, RulesetOutput } from './lib/create-file';

const MAGIC_COMMAND_SKIP = '# $ custom_build_script';
const MAGIC_COMMAND_TITLE = '# $ meta_title ';
const MAGIC_COMMAND_DESCRIPTION = '# $ meta_description ';
const MAGIC_COMMAND_SGMODULE_MITM_HOSTNAMES = '# $ sgmodule_mitm_hostnames ';

const domainsetSrcFolder = 'domainset' + path.sep;

const clawSourceDirPromise = new Fdir()
  .withRelativePaths()
  .filter((filepath, isDirectory) => {
    if (isDirectory) return true;

    const extname = path.extname(filepath);

    return !(extname === '.js' || extname === '.ts');
  })
  .crawl(SOURCE_DIR)
  .withPromise();

export const buildCommon = task(require.main === module, __filename)(async (span) => {
  const promises: Array<Promise<unknown>> = [];

  const paths = await clawSourceDirPromise;

  for (let i = 0, len = paths.length; i < len; i++) {
    const relativePath = paths[i];
    const fullPath = SOURCE_DIR + path.sep + relativePath;

    if (relativePath.startsWith(domainsetSrcFolder)) {
      promises.push(transformDomainset(span, fullPath));
      continue;
    }
    // if (
    //   relativePath.startsWith('ip/')
    //   || relativePath.startsWith('non_ip/')
    // ) {
    promises.push(transformRuleset(span, fullPath, relativePath));
    // continue;
    // }

    // console.error(picocolors.red(`[build-comman] Unknown file: ${relativePath}`));
  }

  return Promise.all(promises);
});

const $skip = Symbol('skip');

function processFile(span: Span, sourcePath: string) {
  return span.traceChildAsync(`process file: ${sourcePath}`, async () => {
    const lines: string[] = [];

    let title = '';
    const descriptions: string[] = [];
    let sgmodulePathname: string | null = null;

    try {
      for await (const line of readFileByLine(sourcePath)) {
        if (line.startsWith(MAGIC_COMMAND_SKIP)) {
          return $skip;
        }

        if (line.startsWith(MAGIC_COMMAND_TITLE)) {
          title = line.slice(MAGIC_COMMAND_TITLE.length).trim();
          continue;
        }

        if (line.startsWith(MAGIC_COMMAND_DESCRIPTION)) {
          descriptions.push(line.slice(MAGIC_COMMAND_DESCRIPTION.length).trim());
          continue;
        }

        if (line.startsWith(MAGIC_COMMAND_SGMODULE_MITM_HOSTNAMES)) {
          sgmodulePathname = line.slice(MAGIC_COMMAND_SGMODULE_MITM_HOSTNAMES.length).trim();
          continue;
        }

        const l = processLine(line);
        if (l) {
          lines.push(l);
        }
      }
    } catch (e) {
      console.error('Error processing', sourcePath);
      console.trace(e);
    }

    return [title, descriptions, lines, sgmodulePathname] as const;
  });
}

function transformDomainset(parentSpan: Span, sourcePath: string) {
  const extname = path.extname(sourcePath);
  const basename = path.basename(sourcePath, extname);
  return parentSpan
    .traceChildAsync(
      `transform domainset: ${basename}`,
      async (span) => {
        const res = await processFile(span, sourcePath);
        if (res === $skip) return;

        const id = basename;
        const [title, incomingDescriptions, lines] = res;

        let finalDescriptions: string[];
        if (incomingDescriptions.length) {
          finalDescriptions = SHARED_DESCRIPTION.slice();
          finalDescriptions.push('');
          appendArrayInPlace(finalDescriptions, incomingDescriptions);
        } else {
          finalDescriptions = SHARED_DESCRIPTION;
        }

        return new DomainsetOutput(span, id)
          .withTitle(title)
          .withDescription(finalDescriptions)
          .addFromDomainset(lines)
          .write();
      }
    );
}

/**
 * Output Surge RULE-SET and Clash classical text format
 */
async function transformRuleset(parentSpan: Span, sourcePath: string, relativePath: string) {
  const extname = path.extname(sourcePath);
  const basename = path.basename(sourcePath, extname);

  return parentSpan
    .traceChild(`transform ruleset: ${basename}`)
    .traceAsyncFn(async (span) => {
      const res = await processFile(span, sourcePath);
      if (res === $skip) return;

      const id = basename;
      const type = relativePath.slice(0, -extname.length).split(path.sep)[0];

      if (type !== 'ip' && type !== 'non_ip') {
        throw new TypeError(`Invalid type: ${type}`);
      }

      const [title, descriptions, lines, sgmodulePathname] = res;

      let description: string[];
      if (descriptions.length) {
        description = SHARED_DESCRIPTION.slice();
        description.push('');
        appendArrayInPlace(description, descriptions);
      } else {
        description = SHARED_DESCRIPTION;
      }

      return new RulesetOutput(span, id, type)
        .withTitle(title)
        .withDescription(description)
        .withMitmSgmodulePath(sgmodulePathname)
        .addFromRuleset(lines)
        .write();
    });
}
