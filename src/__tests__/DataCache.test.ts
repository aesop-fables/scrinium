import { firstValueFrom } from 'rxjs';
import { AppData } from '../AppData';
import { DataCompartmentOptions, DataCompartmentEvents, ConfiguredDataSource } from '../Compartments';
import { createDataCacheScenario } from '../Utils';
import { wait } from './utils';

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

test('DataCache > compartments > load > equality > happy path', async () => {
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

test('DataCache > compartments > load > autoLoad is false', async () => {
  const a: ResponseA[] = [{ name: 'test' }];
  const b: ResponseB[] = [{ email: 'test@test.com' }];

  const { createProxy, waitForAllCompartments } = createDataCacheScenario<TestStoreCompartments>({
    a: {
      source: new ConfiguredDataSource(async () => a),
      autoLoad: true,
      defaultValue: [],
    },
    b: {
      source: new ConfiguredDataSource(async () => b),
      autoLoad: false,
      defaultValue: [],
    },
  });

  await waitForAllCompartments();
  const observedA = await createProxy<ResponseA>('a');
  expect(observedA).toStrictEqual(a);

  const observedB = await createProxy<ResponseB>('b');
  expect(observedB).toStrictEqual([]);
});

test('DataCache > compartments > autoload > happy path', async () => {
  let loadCount = 0;
  // autoload is true by default
  createDataCacheScenario<TestStoreCompartments>({
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

  expect(loadCount).toStrictEqual(2);
});

test('DataCache > compartments > initialize > waits for all critical compartments', async () => {
  // dependency: autoload = true
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

  let initialized = await firstValueFrom(cache.initialized$());
  expect(initialized).toBeFalsy();

  cache.initialized$().subscribe({
    next: (value: boolean) => {
      initialized = value;
    },
  });

  await waitForAllCompartments();
  expect(initialized).toBeTruthy();
});

test('DataCache > compartments > initialize > failure > should be false', async () => {
  // dependency: autoload = true
  const { cache, waitForAllCompartments } = createDataCacheScenario<TestStoreCompartments>({
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

  await waitForAllCompartments();

  let hasError = false;
  let initialized = false;
  try {
    initialized = await firstValueFrom(cache.initialized$());
    expect(initialized).toBeFalsy();
  } catch (e) {
    hasError = true;
  }
  expect(hasError).toBeTruthy();

  hasError = false;
  cache.initialized$().subscribe({
    next: (value: boolean) => {
      initialized = value;
    },
    error: () => {
      hasError = true;
    },
  });

  await waitForAllCompartments();
  expect(hasError).toBeTruthy();
  expect(initialized).toBeFalsy();
});

test('DataCache > compartments > initialize > failure > should invoke onError callback', async () => {
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

test('DataCache > state > relays category and errors', async () => {
  // dependency: autoload = true
  const { cache, waitForAllCompartments } = createDataCacheScenario<TestStoreCompartments>({
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

  // Might not be needed but I saw this randomly fail once so let's make sure
  // we don't have a race condition
  await waitForAllCompartments();

  const appData = new AppData();
  cache.observeWith(appData);

  const state = await firstValueFrom(appData.state$());
  expect(state.compartments.length).toBe(2);

  const compartmentA = state.compartments.find((x) => x.key === 'a');
  expect(compartmentA?.hasError).toBeFalsy();

  const compartmentB = state.compartments.find((x) => x.key === 'b');
  expect(compartmentB?.hasError).toBeTruthy();
});

test('DataCache > observe > publishes default value and then the loaded value', async () => {
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

test('DataCache > reload > all', async () => {
  // dependency: autoload = true
  const defaultValue: ResponseA[] = [{ name: 'default' }];
  const loadedValue: ResponseA[] = [{ name: 'loaded' }];
  const loadCounts = {
    a: 0,
    b: 0,
  };

  const { cache } = createDataCacheScenario<TestStoreCompartments>({
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

  expect(loadCounts.a).toBe(1);
  expect(loadCounts.b).toBe(1);

  await cache.reloadAll();

  expect(loadCounts.a).toBe(2);
  expect(loadCounts.b).toBe(2);
});

test('DataCache > reload > compartment', async () => {
  // dependency: autoload = true
  const defaultValue: ResponseA[] = [{ name: 'default' }];
  const loadedValue: ResponseA[] = [{ name: 'loaded' }];
  const loadCounts = {
    a: 0,
    b: 0,
  };

  const { cache } = createDataCacheScenario<TestStoreCompartments>({
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

  expect(loadCounts.a).toBe(1);
  expect(loadCounts.b).toBe(1);

  await cache.reload('b');

  expect(loadCounts.a).toBe(1);
  expect(loadCounts.b).toBe(2);
});

test('DataCache > reset > all', async () => {
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

test('DataCache > reset > compartment', async () => {
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

test('DataCache > reset > invokes onReset', async () => {
  let onResetInvoked = false;

  const { cache, waitForAllCompartments } = createDataCacheScenario<TestStoreCompartments>({
    a: {
      source: new ConfiguredDataSource(async () => []),
      defaultValue: [],
    },
    b: {
      source: new ConfiguredDataSource(async () => []),
      defaultValue: [],
    },
  });

  await waitForAllCompartments();
  cache.watch('a', DataCompartmentEvents.Reset, () => {
    onResetInvoked = true;
  });
  await cache.reset('a');

  expect(onResetInvoked).toBeTruthy();
});
