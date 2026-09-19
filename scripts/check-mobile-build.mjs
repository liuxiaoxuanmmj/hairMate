import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const forbiddenSource = /(?:packages\/server\/|apps\/(api|worker)\/|node_modules\/(?:\.pnpm\/)?(?:pg@|pg\/|fastify[@/]|drizzle-orm[@/]|pg-boss[@/]|ali-oss[@/]|openai[@/]|@ai-sdk[+/]))/;
export function checkSourceMap(map) {
  if (!Array.isArray(map.sources) || !map.sources.length) throw new Error('Missing source-map sources.');
  for (const source of map.sources) {
    if (typeof source !== 'string') throw new Error('Invalid source-map entry.');
    if (forbiddenSource.test(source.replaceAll('\\', '/'))) throw new Error(`Server code in client bundle: ${source}`);
  }
  if (JSON.stringify(map).includes('HAIRMATE_SERVER_ONLY_SENTINEL')) throw new Error('Server-only build sentinel leaked.');
}
const walk = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);

export function checkMobileBuild(root) {
  const files = walk(path.join(root, 'apps/mobile/dist'));
  const maps = files.filter((file) => file.endsWith('.map'));
  for (const platform of ['android', 'ios', 'web']) {
    if (!maps.some((file) => file.includes(`/${platform}/`))) throw new Error(`Missing ${platform} bundle source map.`);
  }
  for (const file of maps) checkSourceMap(JSON.parse(readFileSync(file, 'utf8')));
  if (!maps.some((file) => JSON.parse(readFileSync(file, 'utf8')).sources.some((source) => source.includes('WelcomeScreen')))) throw new Error('App entry not present in bundle maps.');
  return maps.length;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(`PASS: ${checkMobileBuild(fileURLToPath(new URL('../', import.meta.url)))} mobile bundle source maps, no server implementation.`); }
  catch (error) { console.error(`FAIL: ${error.message}`); process.exitCode = 1; }
}
