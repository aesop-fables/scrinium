import 'reflect-metadata';
import { firstValueFrom } from 'rxjs';
import { ApplicationState } from '../ApplicationState';
import { AppStorage } from '../AppStorage';
import { DataCompartmentOptions } from '../Compartments';
import { ConfiguredDataSource } from '../ConfiguredDataSource';
import { createDataCacheScenario } from '../Utils';
import { AppStorageToken } from '../AppStorageToken';

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
    const token = new AppStorageToken('test-cache');
    const { cache } = createDataCacheScenario<TestStoreCompartments>(token, {
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

    const key = token.key;
    const storage = new AppStorage();
    storage.store(cache);

    const subject = new ApplicationState(storage);
    const state$ = subject.createObservable();

    await cache.reloadAll();

    const state = await firstValueFrom(state$);
    const a = state.compartments.find((x) => x.storageKey === key && x.token.equals(token.append('a')));
    const b = state.compartments.find((x) => x.storageKey === key && x.token.equals(token.append('b')));

    expect(a).toBeDefined();
    expect(a?.error).toBeUndefined();

    expect(b).toBeDefined();
    expect(b?.error).toBeDefined();
    expect(b?.initialized).toBeFalsy();
  });
});
