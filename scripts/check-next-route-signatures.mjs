import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const routeFile = resolve(scriptDir, '..', 'apps/web/app/api/backend/[...path]/route.ts');
const source = readFileSync(routeFile, 'utf8');

const forbiddenPatterns = ['params: { path:', 'RouteContext', '{ params }: { params: {'];
const requiredPatterns = ['params: Promise<', 'await params'];

const foundForbidden = forbiddenPatterns.find((pattern) => source.includes(pattern));
if (foundForbidden) {
  console.error(`Forbidden Next.js route signature pattern found: "${foundForbidden}" in ${routeFile}`);
  process.exit(1);
}

const missingRequired = requiredPatterns.find((pattern) => !source.includes(pattern));
if (missingRequired) {
  console.error(`Required Next.js route signature pattern missing: "${missingRequired}" in ${routeFile}`);
  process.exit(1);
}

console.log('Next.js route signature check passed');
