import { ApplicationCacheManager } from '../Caching';
import { systemClock } from '../System';

describe('ApplicationCacheManager', () => {
  test('Find a previously registered token', () => {
    const cache = new ApplicationCacheManager();
    cache.register('key');

    const token = cache.find('key');
    expect(token).toBeDefined();
    expect(token?.isExpired(systemClock)).toBeFalsy();
  });

  test('Finding a non-existent token returns undefined', () => {
    const cache = new ApplicationCacheManager();
    const token = cache.find('key');
    expect(token).toBeUndefined();
  });

  test('Invalidate a token', () => {
    const cache = new ApplicationCacheManager();
    cache.register('key');
    cache.invalidate('key');

    const token = cache.find('key');
    expect(token?.isExpired(systemClock)).toBeTruthy();
  });
});
