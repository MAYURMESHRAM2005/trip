import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  parseServiceAccount,
  resolveFirebaseConfig,
} from '../src/services/firebase.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, '..');
const SERVICE_URL = pathToFileURL(
  path.resolve(BACKEND_ROOT, 'src/services/firebase.service.js')
).href;

const SERVICE_ACCOUNT = {
  type: 'service_account',
  project_id: 'travel-mind-ai',
  private_key_id: 'key-id',
  private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq\n-----END PRIVATE KEY-----\n',
  client_email: 'firebase-adminsdk@travel-mind-ai.iam.gserviceaccount.com',
};

/**
 * Run a small ESM snippet in a child process with the given FIREBASE_* env.
 * dotenv never overrides variables that already exist (even as ""), so this
 * simulates the deployed environment without touching the local .env.
 */
function runChild(firebaseEnv, body) {
  const script = `
    const service = (await import(${JSON.stringify(SERVICE_URL)})).default;
    const { init, isFirebaseConfigured } = service;
    let initResult;
    try {
      init();
      initResult = 'INIT_OK';
    } catch (e) {
      initResult = \`INIT_FAIL \${e.statusCode} \${e.message}\`;
    }
    console.log(JSON.stringify({ initResult, configured: isFirebaseConfigured() }));
    ${body || ''}
  `;
  const stdout = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: BACKEND_ROOT,
    env: {
      ...process.env,
      FIREBASE_PROJECT_ID: '',
      FIREBASE_SERVICE_ACCOUNT: '',
      FIREBASE_SERVICE_ACCOUNT_PATH: '',
      ...firebaseEnv,
    },
    encoding: 'utf8',
  });
  // The service logs on init, so the result is the last JSON line printed.
  const lines = stdout.split('\n').map((l) => l.trim()).filter(Boolean);
  return JSON.parse(lines[lines.length - 1]);
}

test('parseServiceAccount reads a raw JSON service account', () => {
  const parsed = parseServiceAccount(JSON.stringify(SERVICE_ACCOUNT));
  assert.equal(parsed.project_id, 'travel-mind-ai');
  assert.equal(parsed.private_key_id, 'key-id');
});

test('parseServiceAccount reads a base64 service account (single-line paste)', () => {
  const parsed = parseServiceAccount(Buffer.from(JSON.stringify(SERVICE_ACCOUNT)).toString('base64'));
  assert.equal(parsed.client_email, SERVICE_ACCOUNT.client_email);
});

test('parseServiceAccount reads a JSON value wrapped in quotes', () => {
  const parsed = parseServiceAccount(JSON.stringify(JSON.stringify(SERVICE_ACCOUNT)));
  assert.equal(parsed.project_id, 'travel-mind-ai');
});

test('parseServiceAccount restores literal \\n newlines in the private key', () => {
  const escaped = JSON.stringify(SERVICE_ACCOUNT).replace(/\\n/g, '\\\\n');
  const parsed = parseServiceAccount(escaped);
  assert.match(parsed.private_key, /-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq\n-----END PRIVATE KEY-----\n/);
});

test('parseServiceAccount rejects values that are not a service account', () => {
  assert.equal(parseServiceAccount(''), null);
  assert.equal(parseServiceAccount('   '), null);
  assert.equal(parseServiceAccount('not json at all'), null);
  assert.equal(parseServiceAccount('{"type":"service_account"}'), null, 'needs a private_key');
});

test('resolveFirebaseConfig falls back to the project id when the key file is absent', () => {
  const config = resolveFirebaseConfig({
    env: {
      FIREBASE_PROJECT_ID: 'travel-mind-ai',
      FIREBASE_SERVICE_ACCOUNT: '',
      FIREBASE_SERVICE_ACCOUNT_PATH: 'src/config/does-not-exist.json',
    },
    fileExists: () => false,
  });
  assert.equal(config.serviceAccount, null);
  assert.equal(config.projectId, 'travel-mind-ai');
  assert.equal(config.source, null);
  assert.match(config.notes.join(' '), /does not exist on this host/);
});

test('resolveFirebaseConfig uses the key file when it is present', () => {
  const keyFile = path.resolve(BACKEND_ROOT, 'test-service-account.json');
  const config = resolveFirebaseConfig({
    env: { FIREBASE_PROJECT_ID: '', FIREBASE_SERVICE_ACCOUNT_PATH: keyFile },
    fileExists: (p) => p === keyFile,
    readFile: () => JSON.stringify(SERVICE_ACCOUNT),
  });
  assert.equal(config.source, 'FIREBASE_SERVICE_ACCOUNT_PATH');
  assert.equal(config.projectId, 'travel-mind-ai', 'falls back to the key file project id');
});

test('resolveFirebaseConfig prefers an explicit FIREBASE_PROJECT_ID and takes FIREBASE_SERVICE_ACCOUNT as raw JSON', () => {
  const config = resolveFirebaseConfig({
    env: { FIREBASE_PROJECT_ID: 'travel-mind-ai', FIREBASE_SERVICE_ACCOUNT: JSON.stringify(SERVICE_ACCOUNT) },
  });
  assert.equal(config.source, 'FIREBASE_SERVICE_ACCOUNT');
  assert.equal(config.projectId, 'travel-mind-ai');
});

test('init() starts with the project id even though FIREBASE_SERVICE_ACCOUNT_PATH points at a missing file', () => {
  // Exact production shape: the git-ignored key file is not deployed.
  const { initResult, configured } = runChild({
    FIREBASE_PROJECT_ID: 'travel-mind-ai',
    FIREBASE_SERVICE_ACCOUNT_PATH: 'src/config/firebase-admin.json-does-not-exist',
  });
  assert.equal(initResult, 'INIT_OK');
  assert.equal(configured, true);
});

test('init() reports an actionable 503 instead of a 500 when nothing is configured', () => {
  const { initResult, configured } = runChild({});
  assert.match(initResult, /^INIT_FAIL 503 /);
  assert.match(initResult, /FIREBASE_PROJECT_ID or FIREBASE_SERVICE_ACCOUNT/);
  assert.equal(configured, false);
});
