import 'reflect-metadata';
import { firstValueFrom } from 'rxjs';
import { DataCompartmentOptions, ConfiguredDataSource } from '../Compartments';
import { createDataCacheScenario } from '../Utils';
import { wait } from './utils';
import { waitUntil } from '../tasks';

interface ResponseA {
  name: string;
}

interface ResponseB {
  email: string;
}

interface TestStoreCompartments {
  a: DataCompartmentOptions<ResponseA[]>;
  b: DataCompartmentOptions<ResponseB[]>;
}

describe('DataCache', () => {
  describe('createDataCache', () => {
    test('Happy path', async () => {
      const a: ResponseA[] = [];
      const b: ResponseB[] = [];

      const { createProxy } = createDataCacheScenario<TestStoreCompartments>({
        a: {
          source: new ConfiguredDataSource(async () => a),
          defaultValue: [],
        },
        b: {
          source: new ConfiguredDataSource(async () => b),
          defaultValue: [],
        },
      });

      const observedA = await createProxy<ResponseA>('a');
      expect(observedA).toStrictEqual(a);

      const observedB = await createProxy<ResponseB>('b');
      expect(observedB).toStrictEqual(b);
    });

    test('AutoLoad is false does not load and uses default value', async () => {
      const a: ResponseA[] = [{ name: 'test' }];
      const b: ResponseB[] = [{ email: 'test@test.com' }];

      const { createProxy, waitForAllCompartments } = createDataCacheScenario<TestStoreCompartments>({
        a: {
          source: new ConfiguredDataSource(async () => a),
          loadingOptions: {
            strategy: 'auto',
          },
          defaultValue: [],
        },
        b: {
          source: new ConfiguredDataSource(async () => b),
          loadingOptions: {
            strategy: 'manual',
          },
          defaultValue: [],
        },
      });

      await waitForAllCompartments();
      const observedA = await createProxy<ResponseA>('a');
      expect(observedA).toStrictEqual(a);

      const observedB = await createProxy<ResponseB>('b');
      expect(observedB).toStrictEqual([]);
    });

    test('Autoload true happy path', async () => {
      let loadCount = 0;
      // autoload is true by default
      const { waitForAllCompartments } = createDataCacheScenario<TestStoreCompartments>({
        a: {
          source: new ConfiguredDataSource(async () => {
            ++loadCount;
            return [];
          }),
          defaultValue: [],
        },
        b: {
          source: new ConfiguredDataSource(async () => {
            ++loadCount;
            return [];
          }),
          defaultValue: [],
        },
      });

      await waitForAllCompartments();

      expect(loadCount).toStrictEqual(2);
    });
  });

  describe('initialize$()', () => {
    test('Waits for all compartments', async () => {
      // autoload = true
      const { cache, waitForAllCompartments } = createDataCacheScenario<TestStoreCompartments>({
        a: {
          source: new ConfiguredDataSource(async () => {
            await wait(300);
            return [];
          }),
          defaultValue: [],
        },
        b: {
          source: new ConfiguredDataSource(async () => {
            await wait(550);
            return [];
          }),
          defaultValue: [],
        },
      });

      let initialized = await firstValueFrom(cache.initialized$);
      expect(initialized).toBeFalsy();

      cache.initialized$.subscribe({
        next: (value: boolean) => {
          initialized = value;
        },
      });

      await waitForAllCompartments();
      expect(initialized).toBeTruthy();
    });

    test('Initialized publishes false when an error occurs', async () => {
      // dependency: autoload = true
      const { cache } = createDataCacheScenario<TestStoreCompartments>({
        a: {
          source: new ConfiguredDataSource(async () => []),
          defaultValue: [],
        },
        b: {
          source: new ConfiguredDataSource(async () => {
            throw new Error('intentional error');
          }),
          defaultValue: [],
        },
      });

      let hasError = false;
      let initialized = false;
      try {
        initialized = await waitUntil(() => firstValueFrom(cache.initialized$), {
          millisecondPolling: 10,
          timeoutInMilliseconds: 100,
        });
      } catch (e) {
        hasError = true;
      }
      expect(hasError).toBeTruthy();
      expect(initialized).toBeFalsy();
    });

    test('Failure should invoke onError callback', async () => {
      // dependency: autoload = true
      let theError: Error | undefined;
      const { waitForAllCompartments } = createDataCacheScenario<TestStoreCompartments>({
        a: {
          source: new ConfiguredDataSource(async () => []),
          defaultValue: [],
        },
        b: {
          source: new ConfiguredDataSource(async () => {
            throw new Error('intentional error');
          }),
          defaultValue: [],
          onError: (e) => {
            theError = e;
          },
        },
      });

      await waitForAllCompartments();

      expect(theError?.message).toEqual('intentional error');
    });
  });

  describe('observe$()', () => {
    test('Publishes default value and then the loaded value', async () => {
      // dependency: autoload = true
      const defaultValue: ResponseA[] = [{ name: 'default' }];
      const loadedValue: ResponseA[] = [{ name: 'loaded' }];
      const { cache, waitForAllCompartments } = createDataCacheScenario<TestStoreCompartments>({
        a: {
          source: new ConfiguredDataSource(async () => loadedValue),
          defaultValue,
        },
        b: {
          source: new ConfiguredDataSource(async () => [{ email: 'loaded@loaded.com' }]),
          defaultValue: [],
        },
      });

      let hasError = false;
      const values: ResponseA[][] = [];
      cache.observe$<ResponseA[]>('a').subscribe({
        next: (value: ResponseA[]) => {
          values.push(value);
        },
        error: () => {
          hasError = true;
        },
      });

      await waitForAllCompartments();
      expect(hasError).toBeFalsy();
      expect(values[0]).toStrictEqual(defaultValue);
      expect(values[1]).toStrictEqual(loadedValue);
    });
  });

  describe('reloadAll()', () => {
    test('Reloads all compartments', async () => {
      // dependency: autoload = true
      const defaultValue: ResponseA[] = [{ name: 'default' }];
      const loadedValue: ResponseA[] = [{ name: 'loaded' }];
      const loadCounts = {
        a: 0,
        b: 0,
      };

      const { cache, waitForAllCompartments } = createDataCacheScenario<TestStoreCompartments>({
        a: {
          source: new ConfiguredDataSource(async () => {
            loadCounts.a++;
            return loadedValue;
          }),
          defaultValue,
        },
        b: {
          source: new ConfiguredDataSource(async () => {
            loadCounts.b++;
            return [{ email: 'loaded@loaded.com' }];
          }),
          defaultValue: [],
        },
      });

      await waitForAllCompartments();
      expect(loadCounts.a).toBe(1);
      expect(loadCounts.b).toBe(1);

      await wait(100);
      await cache.reloadAll();

      expect(loadCounts.a).toBe(2);
      expect(loadCounts.b).toBe(2);
    });
  });

  describe('reload()', () => {
    test('Reloads the compartment', async () => {
      // dependency: autoload = true
      const defaultValue: ResponseA[] = [{ name: 'default' }];
      const loadedValue: ResponseA[] = [{ name: 'loaded' }];
      const loadCounts = {
        a: 0,
        b: 0,
      };

      const { cache, waitForAllCompartments } = createDataCacheScenario<TestStoreCompartments>({
        a: {
          source: new ConfiguredDataSource(async () => {
            loadCounts.a++;
            return loadedValue;
          }),
          defaultValue,
        },
        b: {
          source: new ConfiguredDataSource(async () => {
            loadCounts.b++;
            return [{ email: 'loaded@loaded.com' }];
          }),
          defaultValue: [],
        },
      });

      await waitForAllCompartments();

      expect(loadCounts.a).toBe(1);
      expect(loadCounts.b).toBe(1);

      await wait(100);
      await cache.reload('b');

      expect(loadCounts.a).toBe(1);
      expect(loadCounts.b).toBe(2);
    });
  });

  describe('resetAll()', () => {
    test('Resets all compartments', async () => {
      // dependency: autoload = true
      const defaultValue: ResponseA[] = [{ name: 'default' }];
      const loadedValue: ResponseA[] = [{ name: 'loaded' }];

      const { cache, createProxy, waitForAllCompartments } = createDataCacheScenario<TestStoreCompartments>({
        a: {
          source: new ConfiguredDataSource(async () => loadedValue),
          defaultValue,
        },
        b: {
          source: new ConfiguredDataSource(async () => {
            return [{ email: 'loaded@loaded.com' }];
          }),
          defaultValue: [],
        },
      });

      await waitForAllCompartments();
      await cache.resetAll();

      const loadedA = await createProxy<ResponseA[]>('a');
      const loadedB = await createProxy<ResponseA[]>('b');

      expect(loadedA).toStrictEqual(defaultValue);
      expect(loadedB).toStrictEqual([]);
    });
  });

  describe('reset()', () => {
    test('Resets the individual compartmnet', async () => {
      // dependency: autoload = true
      const defaultValue: ResponseA[] = [{ name: 'default' }];
      const loadedValue: ResponseA[] = [{ name: 'loaded' }];

      const { cache, createProxy, waitForAllCompartments } = createDataCacheScenario<TestStoreCompartments>({
        a: {
          source: new ConfiguredDataSource(async () => loadedValue),
          defaultValue,
        },
        b: {
          source: new ConfiguredDataSource(async () => {
            return [{ email: 'loaded@loaded.com' }];
          }),
          defaultValue: [],
        },
      });

      await waitForAllCompartments();
      await cache.reset('a');

      const loadedA = await createProxy<ResponseA[]>('a');
      const loadedB = await createProxy<ResponseA[]>('b');

      expect(loadedA).toStrictEqual(defaultValue);
      expect(loadedB).toStrictEqual([{ email: 'loaded@loaded.com' }]);
    });
  });
});
