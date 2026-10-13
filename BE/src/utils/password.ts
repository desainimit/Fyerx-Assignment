import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';

// scrypt is built into Node, so there is no native module to compile.
// Cost parameters are stored inside each hash, so they can be raised later
// without breaking verification of existing passwords.
const SCRYPT_PARAMS = { N: 2 ** 15, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_MEMORY = 64 * 1024 * 1024;

function deriveKey(
  password: string,
  salt: Buffer,
  options: ScryptOptions,
  keyLength: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

// Format: scrypt$N$r$p$<salt base64>$<key base64>
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const { N, r, p } = SCRYPT_PARAMS;
  const key = await deriveKey(
    password,
    salt,
    { N, r, p, maxmem: MAX_MEMORY },
    KEY_LENGTH,
  );
  return [
    'scrypt',
    N,
    r,
    p,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const parts = storedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [N, r, p] = parts.slice(1, 4).map(Number);
  if (![N, r, p].every(Number.isSafeInteger)) return false;
  const salt = Buffer.from(parts[4], 'base64');
  const expected = Buffer.from(parts[5], 'base64');
  if (!salt.length || !expected.length) return false;
  try {
    const actual = await deriveKey(
      password,
      salt,
      { N, r, p, maxmem: MAX_MEMORY },
      expected.length,
    );
    // Constant-time comparison avoids leaking how many bytes matched.
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
