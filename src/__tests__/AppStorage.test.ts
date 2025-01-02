import 'reflect-metadata';
import { firstValueFrom } from 'rxjs';
import { AppStorage } from '../AppStorage';
import { DataCompartmentOptions } from '../Compartments';
import { ConfiguredDataSource } from '../ConfiguredDataSource';
import { ConfiguredEntityResolver, createRepository } from '../Repository';
import { createDataCacheScenario } from '../Utils';
import { Video, VideoMetadata, VideoRegistry } from './Common';
import { wait } from './utils';
import { ApplicationState } from '../ApplicationState';
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

const testCacheToken = new AppStorageToken('testCache');
const testRepoToken = new AppStorageToken('testRepo');

describe('AppStorage', () => {
  test('state', async () => {
    const { cache } = createDataCacheScenario<TestStoreCompartments>(testCacheToken, {
      a: {
        source: new ConfiguredDataSource(async () => []),
        defaultValue: [],
      },
      b: {
        source: new ConfiguredDataSource(async () => []),
        defaultValue: [],
      },
    });

    const repository = createRepository<VideoRegistry>(testRepoToken, {
      metadata: {
        resolver: new ConfiguredEntityResolver<string, VideoMetadata>(async () => {
          await wait(150);
          return {} as VideoMetadata;
        }),
      },
      videos: {
        resolver: new ConfiguredEntityResolver<string, Video>(async () => {
          await wait(100);
          return {} as Video;
        }),
      },
    });

    const storage = new AppStorage();
    storage.store(cache);
    storage.storeRepository(repository);

    const { state$ } = storage;
    const state = await firstValueFrom(state$);
    expect(state.dataCaches.length).toBe(1);
    expect(state.dataCaches[0].storageKey).toBe('testCache');
    expect(state.dataCaches[0].dataCache).toBe(cache);

    expect(state.repositories.length).toBe(1);
    expect(state.repositories[0].repository).toBe(repository);
    expect(state.repositories[0].storageKey).toBe('testRepo');
  });

  test('clearAll', async () => {
    const { cache } = createDataCacheScenario<TestStoreCompartments>(testCacheToken, {
      a: {
        source: new ConfiguredDataSource(async () => []),
        defaultValue: [],
      },
      b: {
        source: new ConfiguredDataSource(async () => []),
        defaultValue: [],
      },
    });

    const repository = createRepository<VideoRegistry>(testRepoToken, {
      metadata: {
        resolver: new ConfiguredEntityResolver<string, VideoMetadata>(async () => {
          await wait(150);
          return {} as VideoMetadata;
        }),
      },
      videos: {
        resolver: new ConfiguredEntityResolver<string, Video>(async () => {
          await wait(100);
          return {} as Video;
        }),
      },
    });

    const storage = new AppStorage();
    storage.store(cache);
    storage.storeRepository(repository);

    await cache.reloadAll();
    await repository.get('videos', '1');

    await storage.clearAll();

    const subject = new ApplicationState(storage);
    const state = await firstValueFrom(subject.createObservable());
    expect(state.compartments.every((x) => !x.initialized)).toBeTruthy();
  });
});
