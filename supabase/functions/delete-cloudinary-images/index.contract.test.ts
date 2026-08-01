import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(import.meta.dirname, 'index.ts'), 'utf8');

assert.match(source, /Deno\.env\.get\('CLOUDINARY_CLOUD_NAME'\)/);
assert.match(source, /Deno\.env\.get\('CLOUDINARY_API_KEY'\)/);
assert.match(source, /Deno\.env\.get\('CLOUDINARY_API_SECRET'\)/);
assert.doesNotMatch(source, /const\s+(?:API_KEY|API_SECRET)\s*=\s*['"]/);
assert.doesNotMatch(source, /Access-Control-Allow-Origin':\s*'\*'/);
assert.match(source, /authClient\.auth\.getUser\(token\)/);
assert.match(source, /from\('perfiles'\)/);
assert.match(source, /role\?\.nombre !== 'Administrador'/);
assert.match(source, /invalid_content_type/);
assert.match(source, /payload_too_large/);
assert.match(source, /invalid_payload/);
assert.match(source, /cloudinary_delete_failed/);
assert.match(source, /https:\/\/admin\.appvielha\.com/);
assert.match(source, /https:\/\/app\.appvielha\.com/);
assert.match(source, /\^logistica\\\/(visitas\|facturas)\\\//);
assert.doesNotMatch(source, /console\.(?:log|error)\(/);

console.log('delete-cloudinary-images contract: OK');
