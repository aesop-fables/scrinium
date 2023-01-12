import { Keychain, wait } from '..';

describe('Keychain', () => {
  test('registers key with the appropriate expiration date', async () => {
    const keychain = new Keychain();
    const now = new Date().getTime();
    keychain.register('123', 500);

    const key = keychain.find('123');
    expect(key.isExpired).toBeFalsy();
    expect((key.expiration() ?? 0) - now).toBe(500);
  });

  test('registers key with no expiration date', async () => {
    const keychain = new Keychain();
    keychain.register('123');

    const key = keychain.find('123');
    expect(key.isExpired).toBeFalsy();
    expect(key.expiration()).toBeUndefined();
  });

  test('registers key and expires', async () => {
    const keychain = new Keychain();
    keychain.register('123', 100);

    await wait(200);

    const key = keychain.find('123');
    expect(key.isExpired).toBeTruthy();
  });
});
