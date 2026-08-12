import assert from 'node:assert/strict';
import type { HandlerEvent } from '@netlify/functions';
import { isAllowedFunctionRequest } from './admin-user-utils';

const event = (headers: HandlerEvent['headers'], rawUrl = 'https://admin.appvielha.com/.netlify/functions/admin-list-users') =>
  ({ headers, rawUrl }) as Pick<HandlerEvent, 'headers' | 'rawUrl'>;

assert.equal(isAllowedFunctionRequest(event({ origin: 'https://admin.appvielha.com' })), true);
assert.equal(isAllowedFunctionRequest(event({ origin: 'https://deploy-preview-6--logistica-fernaguez-admin.netlify.app' })), true);
assert.equal(isAllowedFunctionRequest(event({ origin: 'https://deploy-preview-123--logistica-fernaguez-admin.netlify.app' })), true);
assert.equal(isAllowedFunctionRequest(event({ origin: 'http://localhost:5173' })), true);
assert.equal(isAllowedFunctionRequest(event({ origin: 'http://127.0.0.1:5173' })), true);
assert.equal(isAllowedFunctionRequest(event({ origin: 'https://app.appvielha.com' })), false);
assert.equal(isAllowedFunctionRequest(event({ origin: 'https://untrusted.example' })), false);
assert.equal(isAllowedFunctionRequest(event({ host: 'deploy-preview-6--logistica-fernaguez-admin.netlify.app', 'sec-fetch-site': 'same-origin' }, 'https://deploy-preview-6--logistica-fernaguez-admin.netlify.app/.netlify/functions/admin-list-users')), true);
assert.equal(isAllowedFunctionRequest(event({ origin: 'https://deploy-preview-14--logistica-fernaguez-admin.netlify.app' })), true);
assert.equal(isAllowedFunctionRequest(event({ origin: 'https://deploy-preview-14--logistica-fernaguez-mobile.netlify.app' })), false);
assert.equal(isAllowedFunctionRequest(event({ origin: 'https://deploy-preview-14--logistica-fernaguez-admin.netlify.app.evil.example' })), false);
assert.equal(isAllowedFunctionRequest(event({ host: 'untrusted.example', 'sec-fetch-site': 'same-origin' }, 'https://untrusted.example/.netlify/functions/admin-list-users')), false);

console.log('admin-user CORS tests passed');
