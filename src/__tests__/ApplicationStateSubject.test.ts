import 'reflect-metadata';
import { firstValueFrom } from 'rxjs';
import { ApplicationState } from '../ApplicationState';
import { AppStorage } from '../AppStorage';
import { ConfiguredDataSource, DataCompartmentOptions } from '../Compartments';
import { createDataCacheScenario } from '../Utils';
import { DataCacheHash } from '../DataCacheHash';

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

describe('ApplicationState', () => {
  test('Reports error state', async () => {
    const { cache } = createDataCacheScenario<TestStoreCompartments>({
      a: {
        loadingOptions: {
          strategy: 'manual',
        },
        source: new ConfiguredDataSource(async () => []),
        defaultValue: [],
      },
      b: {
        loadingOptions: {
          strategy: 'manual',
        },
        source: new ConfiguredDataSource(async () => {
          throw new Error('Internal server error');
        }),
        defaultValue: [],
      },
    });

    const key = 'test-cache';
    const storage = new AppStorage();
    storage.store(key, cache);

    const subject = new ApplicationState(storage);
    const state$ = subject.createObservable();

    await cache.reloadAll();

    const state = await firstValueFrom(state$);
    const hash = DataCacheHash.from(cache);
    const a = state.compartments.find((x) => x.hash.toString() === hash && x.key === 'a');
    const b = state.compartments.find((x) => x.hash.toString() === hash && x.key === 'b');

    expect(a).toBeDefined();
    expect(a?.hasError).toBeFalsy();

    expect(b).toBeDefined();
    expect(b?.hasError).toBeTruthy();
    expect(b?.initialized).toBeFalsy();
  });
});
