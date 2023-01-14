import { firstValueFrom } from 'rxjs';
import { AppData } from '../AppData';
import { DataCategory, DataCompartmentOptions } from '../Compartments';
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
      load: async () => a,
      defaultValue: [],
      category: DataCategory.NonCritical,
    },
    b: {
      load: async () => b,
      defaultValue: [],
      category: DataCategory.NonCritical,
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
      load: async () => a,
      autoLoad: true,
      defaultValue: [],
      category: DataCategory.Critical,
    },
    b: {
      load: async () => b,
      autoLoad: false,
      defaultValue: [],
      category: DataCategory.NonCritical,
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
      load: async () => {
        ++loadCount;
        return [];
      },
      defaultValue: [],
      category: DataCategory.NonCritical,
    },
    b: {
      load: async () => {
        ++loadCount;
        return [];
      },
      defaultValue: [],
      category: DataCategory.NonCritical,
    },
  });

  expect(loadCount).toStrictEqual(2);
});

test('DataCache > compartments > initialize > waits for all critical compartments', async () => {
  // dependency: autoload = true
  const { cache, waitForAllCompartments } = createDataCacheScenario<TestStoreCompartments>({
    a: {
      load: async () => {
        await wait(300);
        return [];
      },
      defaultValue: [],
      category: DataCategory.Critical,
    },
    b: {
      load: async () => {
        await wait(550);
        return [];
      },
      defaultValue: [],
      category: DataCategory.Critical,
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
      load: async () => {
        return [];
      },
      defaultValue: [],
      category: DataCategory.Critical,
    },
    b: {
      load: async () => {
        throw new Error('intentional error');
      },
      defaultValue: [],
      category: DataCategory.Critical,
    },
  });

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

test('DataCache > state > relays category and errors', async () => {
  // dependency: autoload = true
  const { cache, waitForAllCompartments } = createDataCacheScenario<TestStoreCompartments>({
    a: {
      load: async () => {
        return [];
      },
      defaultValue: [],
      category: DataCategory.NonCritical,
    },
    b: {
      load: async () => {
        throw new Error('intentional error');
      },
      defaultValue: [],
      category: DataCategory.Critical,
    },
  });

  // Might not be needed but I saw this randomly fail once so let's make sure
  // we don't have a race condition
  await waitForAllCompartments();

  const appData = new AppData();
  cache.observeWith(appData);

  const state = await firstValueFrom(appData.state$());
  expect(state.compartments.length).toBe(2);

  const compartmentA = state.compartments.find((x) => x.name === 'a');
  expect(compartmentA?.hasError).toBeFalsy();
  expect(compartmentA?.category).toBe(DataCategory.NonCritical);

  const compartmentB = state.compartments.find((x) => x.name === 'b');
  expect(compartmentB?.hasError).toBeTruthy();
  expect(compartmentB?.category).toBe(DataCategory.Critical);
});

test('DataCache > observe > publishes default value and then the loaded value', async () => {
  // dependency: autoload = true
  const defaultValue: ResponseA[] = [{ name: 'default' }];
  const loadedValue: ResponseA[] = [{ name: 'loaded' }];
  const { cache, waitForAllCompartments } = createDataCacheScenario<TestStoreCompartments>({
    a: {
      load: async () => {
        return loadedValue;
      },
      defaultValue,
      category: DataCategory.NonCritical,
    },
    b: {
      load: async () => {
        return [{ email: 'loaded@loaded.com' }];
      },
      defaultValue: [],
      category: DataCategory.NonCritical,
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
      load: async () => {
        loadCounts.a++;
        return loadedValue;
      },
      defaultValue,
      category: DataCategory.NonCritical,
    },
    b: {
      load: async () => {
        loadCounts.b++;
        return [{ email: 'loaded@loaded.com' }];
      },
      defaultValue: [],
      category: DataCategory.NonCritical,
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
      load: async () => {
        loadCounts.a++;
        return loadedValue;
      },
      defaultValue,
      category: DataCategory.NonCritical,
    },
    b: {
      load: async () => {
        loadCounts.b++;
        return [{ email: 'loaded@loaded.com' }];
      },
      defaultValue: [],
      category: DataCategory.NonCritical,
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
      load: async () => {
        return loadedValue;
      },
      defaultValue,
      category: DataCategory.NonCritical,
    },
    b: {
      load: async () => {
        return [{ email: 'loaded@loaded.com' }];
      },
      defaultValue: [],
      category: DataCategory.NonCritical,
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
      load: async () => {
        return loadedValue;
      },
      defaultValue,
      category: DataCategory.NonCritical,
    },
    b: {
      load: async () => {
        return [{ email: 'loaded@loaded.com' }];
      },
      defaultValue: [],
      category: DataCategory.NonCritical,
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
      load: async () => {
        return [];
      },
      defaultValue: [],
      category: DataCategory.NonCritical,
      onReset: async () => {
        onResetInvoked = true;
      },
    },
    b: {
      load: async () => {
        return [];
      },
      defaultValue: [],
      category: DataCategory.NonCritical,
    },
  });

  await waitForAllCompartments();
  await cache.reset('a');

  expect(onResetInvoked).toBeTruthy();
});
