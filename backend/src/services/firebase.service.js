import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Backend root = backend/ (two levels up from src/services/)
const BACKEND_ROOT = path.resolve(__dirname, '../..');

let app = null;

/**
 * Resolve a service-account path reliably regardless of the process CWD.
 * Relative paths are resolved against the backend root (backend/), so
 * "src/config/firebase-admin.json" works whether the server is started
 * from backend/ or from the repo root.
 */
function resolveServiceAccountPath(p) {
  if (!p) return '';
  if (path.isAbsolute(p)) return p;
  // Try backend-root-relative first, then CWD-relative (backwards compatible)
  const fromRoot = path.resolve(BACKEND_ROOT, p);
  if (fs.existsSync(fromRoot)) return fromRoot;
  return path.resolve(process.cwd(), p);
}

/**
 * Hosts and dashboards frequently deliver the PEM private key with literal
 * "\n" sequences instead of real newlines; OpenSSL then rejects the key.
 */
function normalizeServiceAccount(sa) {
  const fixed = { ...sa };
  if (typeof fixed.private_key === 'string' && !fixed.private_key.includes('\n')) {
    fixed.private_key = fixed.private_key.replace(/\\n/g, '\n');
  }
  return fixed;
}

/**
 * Parse a service-account value taken from an env var or a key file.
 *
 * Accepts, in order:
 *  - the raw JSON object,
 *  - the JSON wrapped in quotes (how some dashboards store it),
 *  - the JSON base64-encoded on a single line (multi-line env values get
 *    mangled by hosting platforms, so this is the paste-safe form).
 * Returns null when the value is empty or cannot be understood.
 */
export function parseServiceAccount(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  const candidates = [trimmed];
  // A base64 blob (no leading "{") is decoded and tried as JSON too.
  if (!trimmed.startsWith('{')) {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8').trim();
    if (decoded.startsWith('{')) candidates.push(decoded);
  }

  for (const candidate of candidates) {
    let parsed;
    try {
      parsed = JSON.parse(candidate);
    } catch {
      continue;
    }
    // A quoted env value parses to a string that still holds the JSON.
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        continue;
      }
    }
    if (parsed && typeof parsed === 'object' && parsed.private_key) {
      return normalizeServiceAccount(parsed);
    }
  }
  return null;
}

/**
 * Work out how this process can talk to Firebase Admin, without initializing.
 *
 * The Admin SDK only needs a project ID to VERIFY ID tokens (it checks the
 * signature against Google's public certificates), so a full service account
 * is optional. This matters in production: the key file is git-ignored and
 * therefore absent on the deployed host, and a stale FIREBASE_SERVICE_ACCOUNT_
 * PATH pointing at it must not stop sign-in.
 *
 * @param {object} [options]
 * @param {object} [options.env]        env-like object (defaults to the app env)
 * @param {function} [options.fileExists]
 * @param {function} [options.readFile]
 * @returns {{projectId: string, serviceAccount: object|null, source: string|null, notes: string[]}}
 */
export function resolveFirebaseConfig(options = {}) {
  const envLike = options.env || env;
  const fileExists = options.fileExists || fs.existsSync;
  const readFile = options.readFile || ((p) => fs.readFileSync(p, 'utf8'));
  const notes = [];

  let serviceAccount = parseServiceAccount(envLike.FIREBASE_SERVICE_ACCOUNT);
  let source = serviceAccount ? 'FIREBASE_SERVICE_ACCOUNT' : null;

  const rawPath = (envLike.FIREBASE_SERVICE_ACCOUNT_PATH || '').trim();
  if (!serviceAccount && rawPath) {
    const resolved = resolveServiceAccountPath(rawPath);
    if (fileExists(resolved)) {
      serviceAccount = parseServiceAccount(readFile(resolved));
      if (serviceAccount) source = 'FIREBASE_SERVICE_ACCOUNT_PATH';
      else notes.push(`FIREBASE_SERVICE_ACCOUNT_PATH (${resolved}) is not a valid service-account JSON file`);
    } else {
      notes.push(
        `FIREBASE_SERVICE_ACCOUNT_PATH points at ${resolved}, which does not exist on this host (key files are git-ignored and are not deployed)`
      );
    }
  }

  const projectId = (envLike.FIREBASE_PROJECT_ID || '').trim() || serviceAccount?.project_id || '';
  return { projectId, serviceAccount, source, notes };
}

function init() {
  if (app) return app;

  const config = resolveFirebaseConfig();
  const detail = config.notes.length ? ` (${config.notes.join('; ')})` : '';

  if (!config.serviceAccount && !config.projectId) {
    throw ApiError.serviceUnavailable(
      `Google sign-in is not configured on this server${detail}. Set FIREBASE_PROJECT_ID or FIREBASE_SERVICE_ACCOUNT.`
    );
  }

  try {
    app = config.serviceAccount
      ? admin.initializeApp({
          credential: admin.credential.cert(config.serviceAccount),
          projectId: config.projectId || config.serviceAccount.project_id,
        })
      : // Project ID alone is enough to verify ID tokens: the Admin SDK fetches
        // Google's public certificates and validates aud/iss against the project.
        admin.initializeApp({ projectId: config.projectId });
  } catch (e) {
    throw ApiError.serviceUnavailable(`Firebase initialization failed: ${e.message}`);
  }

  logger.info(
    `[FIREBASE] Initialized for project "${config.projectId}" using ${config.source || 'FIREBASE_PROJECT_ID'}${detail}`
  );
  return app;
}

export function isFirebaseConfigured() {
  const config = resolveFirebaseConfig();
  return Boolean(config.serviceAccount || config.projectId);
}

/**
 * Verify a Firebase ID token minted by the Firebase client SDK after Google
 * sign-in. Returns the decoded claims: { uid, email, name, picture, ... }.
 */
export async function verifyFirebaseIdToken(idToken) {
  init();
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch (e) {
    // Distinguish config/SDK failures from genuinely invalid tokens.
    logger.warn('[firebase-verify]', e?.message);
    throw ApiError.unauthorized('Invalid Firebase token');
  }
}

export default { init, isFirebaseConfigured, verifyFirebaseIdToken, parseServiceAccount, resolveFirebaseConfig };
