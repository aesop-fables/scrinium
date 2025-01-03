import { AppStorageCacheToken } from '../Caching';
import { ISystemClock } from '../System';

type AppStorageCacheTokenTestCase = {
  now: string;
  expirationTimestamp?: number;
  isExpired: boolean;
};

describe('AppStorageCacheToken', () => {
  it.each<AppStorageCacheTokenTestCase>([
    { now: '2021-01-01T19:00:00Z', expirationTimestamp: Date.parse('2021-01-01T18:00:00Z'), isExpired: true },
    { now: '2021-01-01T18:00:00Z', expirationTimestamp: Date.parse('2021-01-01T19:00:00Z'), isExpired: false },
  ])('isExpired returns $isExpired ', ({ expirationTimestamp, isExpired, now }) => {
    const currentTime = Date.parse(now);
    const clock: ISystemClock = {
      now() {
        return currentTime;
      },
    };

    const token = new AppStorageCacheToken('key', expirationTimestamp);
    expect(token.isExpired(clock)).toBe(isExpired);
  });
});
