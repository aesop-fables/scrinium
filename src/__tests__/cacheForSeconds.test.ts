import { ApplicationCacheManager } from '../Caching';
import { cacheForSeconds, RetentionContext } from '../Compartments';
import { ConfiguredDataSource } from '../ConfiguredDataSource';
import { DataCompartment } from '../DataCompartment';
import { ISystemClock } from '../System';

describe('cacheForSeconds', () => {
  test('Registers the token', () => {
    const policy = cacheForSeconds(3);
    const compartment = new DataCompartment<string | undefined>('key', {
      source: new ConfiguredDataSource(async () => 'value'),
      defaultValue: undefined,
    });

    const now = Date.now();
    const snapshot: ISystemClock = {
      now: () => now,
    };

    const cache = new ApplicationCacheManager();
    const context = new RetentionContext(cache, snapshot);
    policy.markForExpiration(compartment, context);

    const token = cache.find(compartment.key);
    expect(token?.expirationTimestamp).toBe(now + 3000);
  });
});
