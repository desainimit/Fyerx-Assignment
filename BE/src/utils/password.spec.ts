import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('hashes with a random salt and verifies the original password', async () => {
    const first = await hashPassword('correct horse battery');
    const second = await hashPassword('correct horse battery');

    expect(first).toMatch(/^scrypt\$32768\$8\$1\$[^$]+\$[^$]+$/);
    expect(first).not.toContain('correct horse battery');
    expect(first).not.toBe(second);
    await expect(verifyPassword('correct horse battery', first)).resolves.toBe(
      true,
    );
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct horse battery');
    await expect(verifyPassword('wrong password', hash)).resolves.toBe(false);
  });

  it.each(['', 'plaintext', 'bcrypt$1$2$3$4$5', 'scrypt$x$8$1$c2FsdA==$a2V5'])(
    'rejects malformed stored hash %p',
    async (stored) => {
      await expect(verifyPassword('anything', stored)).resolves.toBe(false);
    },
  );
});
