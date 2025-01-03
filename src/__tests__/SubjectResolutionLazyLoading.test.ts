import 'reflect-metadata';
import { firstValueFrom, map, Observable } from 'rxjs';
import { injectSubject, ISubject } from '../ISubject';
import { injectDataCache } from '../Decorators';
import { createDataCache, DataCache } from '../DataCache';
import { createDataCacheModule, useScrinium } from '../bootstrapping';
import { DataCompartmentOptions } from '../Compartments';
import { createContainer, createServiceModule, Scopes } from '@aesop-fables/containr';
import { predicate, Predicate } from '../Predicate';
import { wait } from '../tasks';
import { AppStorageToken } from '../AppStorageToken';

const TestServices = {
  Cache: 'test-cache',
  CurrentCount: 'current-count',
  Predicate: 'test-cache-initialized',
  Service: 'count-service',
};

type TestCompartments = {
  count: DataCompartmentOptions<number>;
};

@predicate(TestServices.Predicate)
class CurrentCount implements ISubject<number> {
  constructor(@injectDataCache(TestServices.Cache) private readonly cache: DataCache<TestCompartments>) {}

  createObservable(): Observable<number> {
    return this.cache.observe$<number>('count').pipe(map((x) => x));
  }
}

class TestCacheInitialized implements Predicate {
  constructor(@injectDataCache(TestServices.Cache) private readonly cache: DataCache<TestCompartments>) {}

  createObservable(): Observable<boolean> {
    return this.cache.initialized$.pipe(map((initialized) => initialized));
  }
}

class CountService {
  constructor(@injectSubject(TestServices.CurrentCount) private readonly currentCount$: Observable<number>) {}

  async getCount(): Promise<number> {
    return await firstValueFrom(this.currentCount$);
  }
}

const testCacheToken = new AppStorageToken(TestServices.Cache);

describe('Subject Resolution w/ lazy loading', () => {
  test('Injecting a data cache subject does not trigger the compartment', async () => {
    let resolved = false;
    const withTestData = createDataCacheModule((appStorage) => {
      const cache = createDataCache<TestCompartments>(testCacheToken, {
        count: {
          defaultValue: 0,
          loadingOptions: { strategy: 'lazy' },
          source: {
            load() {
              resolved = true;
              return Promise.resolve(42);
            },
          },
        },
      });

      appStorage.store(cache);
    });

    const useTestServices = createServiceModule('test-services', (services) => {
      services.autoResolve(TestServices.CurrentCount, CurrentCount, Scopes.Transient);
      services.autoResolve(TestServices.Predicate, TestCacheInitialized, Scopes.Transient);
    });

    const container = createContainer([useScrinium({ modules: [withTestData] }), useTestServices]);
    const countService = container.resolve(CountService);

    await wait(500);

    expect(resolved).toBe(false);
    const count = await countService.getCount();
    expect(resolved).toBeTruthy();
    expect(count).toBe(42);
  }, 50000);
});
