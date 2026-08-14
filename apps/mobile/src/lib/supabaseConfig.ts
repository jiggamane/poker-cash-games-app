/**
 * What this build was given to talk to, and whether it can possibly work.
 *
 * Split out of `supabase.ts` and deliberately free of any React Native import,
 * for two reasons: it runs under vitest with no simulator, and it has to be
 * readable by a screen that is explaining a failure — including the failure of
 * the client itself to be constructible.
 *
 * THE POINT OF THIS FILE IS "Invalid API key". That is what Supabase's gateway
 * answers with when the `apikey` header is not one of the project's own keys,
 * and it arrives identically for four unrelated causes: no key at all, a key
 * belonging to a different project, a key that has expired, and a key that was
 * mangled on the way into `.env`. As a sentence on a screen it is useless — it
 * names neither the project nor the key nor the file. Every one of those four
 * is decidable here, on the phone, before a single request is made, because a
 * Supabase key carries its own project ref and expiry inside it.
 */

/** What kind of key the string is, judged by its shape rather than its label. */
export type KeyKind =
  | 'anon' // legacy JWT, role anon — what the dashboard calls anon / public
  | 'publishable' // sb_publishable_… — the current format
  | 'service_role' // legacy JWT, role service_role — MUST NEVER BE HERE
  | 'secret' // sb_secret_… — likewise
  | 'unknown';

export interface KeyFacts {
  kind: KeyKind;
  /** The project the key is for, when the key says so. */
  ref: string | null;
  /** When it stops being accepted, when the key says so. */
  expiresAt: Date | null;
  /** Enough of it to compare against the dashboard without printing the lot. */
  tail: string;
}

/**
 * Why this build cannot talk to Supabase, or null when nothing is provably
 * wrong. "Provably" is the whole contract: a problem here is one that can be
 * decided without asking the server, so it is worth putting on a screen.
 */
export type ConfigProblem =
  | 'no-url'
  | 'no-key'
  | 'url-not-a-url'
  | 'url-is-the-dashboard'
  | 'key-is-a-secret'
  | 'key-not-a-key'
  | 'key-expired'
  | 'key-other-project';

export interface SupabaseConfig {
  url: string | null;
  key: string | null;
  /** `eciozeeqywpgqlxqmprl` — the project, as it appears in both the URL and the key. */
  ref: string | null;
  keyFacts: KeyFacts | null;
  problem: ConfigProblem | null;
  /** The problem in the host's language, naming the file they have to edit. */
  complaint: string | null;
}

/**
 * Tidy up a value that was pasted into a file by a human.
 *
 * Trailing newline, surrounding quotes, and — the one that actually bites — a
 * line break in the middle, because a legacy anon key is 200-odd characters and
 * some editors wrap on paste. All three produce a key the gateway refuses with
 * no hint that the key it received is not the key on the screen.
 */
export function tidy(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  const unquoted = raw.trim().replace(/^["']|["']$/g, '');
  const collapsed = unquoted.replace(/\s+/g, '');
  return collapsed === '' ? null : collapsed;
}

/** The project ref out of `https://<ref>.supabase.co`. */
function refFromUrl(url: string): string | null {
  const match = /^https:\/\/([a-z0-9]+)\.supabase\.(co|in)$/i.exec(url);
  return match?.[1]?.toLowerCase() ?? null;
}

/**
 * Read a legacy key's own claims.
 *
 * A Supabase anon key is an unsigned-as-far-as-we-care JWT whose payload names
 * the project (`ref`), the role, and an expiry. We are not verifying it — only
 * the server can do that — we are reading what it says about itself so that a
 * mismatch can be named instead of guessed at.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const json = fromBase64Url(parts[1] ?? '');
  if (json === null) return null;
  try {
    const parsed: unknown = JSON.parse(json);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * base64url → text, by hand.
 *
 * Written out rather than reaching for `atob`, which exists in Hermes and in
 * Node but is not something this file should have to assume. The payload is
 * ASCII JSON, so a byte-per-character decode is exact.
 */
function fromBase64Url(input: string): string | null {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let bits = 0;
  let value = 0;
  let out = '';

  for (const ch of input) {
    const index = ALPHABET.indexOf(ch);
    if (index === -1) return null;
    value = (value << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((value >> bits) & 0xff);
    }
  }

  return out;
}

/** What a key says about itself. */
export function readKey(key: string): KeyFacts {
  const tail = key.slice(-4);

  if (key.startsWith('sb_publishable_')) return { kind: 'publishable', ref: null, expiresAt: null, tail };
  if (key.startsWith('sb_secret_')) return { kind: 'secret', ref: null, expiresAt: null, tail };

  const payload = decodeJwtPayload(key);
  if (payload === null) return { kind: 'unknown', ref: null, expiresAt: null, tail };

  const role = typeof payload.role === 'string' ? payload.role : null;
  const ref = typeof payload.ref === 'string' ? payload.ref.toLowerCase() : null;
  const expiresAt = typeof payload.exp === 'number' ? new Date(payload.exp * 1000) : null;

  return {
    kind: role === 'anon' ? 'anon' : role === 'service_role' ? 'service_role' : 'unknown',
    ref,
    expiresAt,
    tail,
  };
}

/**
 * Everything decidable about this build's configuration, from the two strings.
 *
 * `now` is a parameter so the expiry check is a fact rather than a thing that
 * happens to be true on the day the test runs.
 */
export function readConfig(
  rawUrl: string | undefined,
  rawKey: string | undefined,
  now: Date = new Date(),
): SupabaseConfig {
  const url = tidy(rawUrl);
  const key = tidy(rawKey);

  const keyFacts = key === null ? null : readKey(key);
  const urlRef = url === null ? null : refFromUrl(url);
  const ref = urlRef ?? keyFacts?.ref ?? null;

  const base = { url, key, ref, keyFacts };
  const fail = (problem: ConfigProblem, complaint: string): SupabaseConfig => ({
    ...base,
    problem,
    complaint,
  });

  if (url === null) {
    return fail(
      'no-url',
      'No EXPO_PUBLIC_SUPABASE_URL. Put it in apps/mobile/.env and restart the dev server — the value is read once, when the app is bundled.',
    );
  }

  if (/supabase\.com\/dashboard/i.test(url)) {
    return fail(
      'url-is-the-dashboard',
      'EXPO_PUBLIC_SUPABASE_URL is the dashboard address, not the project’s. It should be https://<project-ref>.supabase.co — the one under Project Settings → Data API.',
    );
  }

  if (!/^https:\/\//i.test(url)) {
    return fail('url-not-a-url', `EXPO_PUBLIC_SUPABASE_URL is not a URL: “${url}”.`);
  }

  if (key === null || keyFacts === null) {
    return fail(
      'no-key',
      'No EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env. Without it every request is refused with “Invalid API key”, which is the server saying it was sent no key it recognises. Take the key from Project Settings → API Keys and restart the dev server.',
    );
  }

  if (keyFacts.kind === 'service_role' || keyFacts.kind === 'secret') {
    return fail(
      'key-is-a-secret',
      'The key in apps/mobile/.env is a SECRET key. It bypasses every security policy in the database and must never ship inside an app. Rotate it in the dashboard now, then put the anon / publishable key here instead.',
    );
  }

  /*
   * Only refuse a key that is not one.
   *
   * Anything shaped like a Supabase key is passed straight through even when
   * this file cannot read it, because the alternative — a build refusing to
   * work because our parser is behind a format change — is a worse failure than
   * the one being prevented. The server is the authority on a key; this is only
   * ever a shortcut to a better sentence. What is caught here is the
   * placeholder out of .env.example, which is nobody's key at all.
   */
  if (keyFacts.kind === 'unknown' && !/^(eyJ|sb_)/.test(key)) {
    return fail(
      'key-not-a-key',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY is not a Supabase key — it looks like the placeholder from .env.example. It should start with sb_publishable_ (Project Settings → API Keys) or eyJ (the legacy anon key), and be copied whole.',
    );
  }

  if (keyFacts.expiresAt !== null && keyFacts.expiresAt.getTime() <= now.getTime()) {
    return fail(
      'key-expired',
      `This anon key expired on ${keyFacts.expiresAt.toISOString().slice(0, 10)}. An expired key is refused with “Invalid API key”. Take the current one from the dashboard.`,
    );
  }

  if (keyFacts.ref !== null && urlRef !== null && keyFacts.ref !== urlRef) {
    return fail(
      'key-other-project',
      `The key belongs to project ${keyFacts.ref} but the URL points at ${urlRef}. Every request is refused with “Invalid API key” because the key is not this project’s. Both lines in apps/mobile/.env have to come from the same project.`,
    );
  }

  return { ...base, problem: null, complaint: null };
}

/**
 * This build's configuration.
 *
 * The two `process.env` reads are written out in full and nowhere else: Expo
 * substitutes EXPO_PUBLIC_ variables into the bundle by matching that exact
 * expression, so a lookup built from a variable resolves to undefined in a real
 * build while working perfectly in a test. Both names are accepted because
 * Supabase renamed the key: projects made before the change have an `anon` key,
 * and ones made after have a `publishable` key and no anon key at all.
 */
export const config: SupabaseConfig = readConfig(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
