import 'reflect-metadata';
import { firstValueFrom } from 'rxjs';
import { AppStorage } from '../AppStorage';
import { ConfiguredDataSource, DataCompartmentOptions } from '../Compartments';
import { ConfiguredEntityResolver, createRepository } from '../Repository';
import { createDataCacheScenario } from '../Utils';
import { Video, VideoMetadata, VideoRegistry } from './Common';
import { wait } from './utils';
import { ApplicationState } from '../ApplicationState';

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

describe('AppStorage', () => {
  test('state', async () => {
    const { cache } = createDataCacheScenario<TestStoreCompartments>({
      a: {
        source: new ConfiguredDataSource(async () => []),
        defaultValue: [],
      },
      b: {
        source: new ConfiguredDataSource(async () => []),
        defaultValue: [],
      },
    });

    const repository = createRepository<VideoRegistry>({
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
    storage.store('cache', cache);
    storage.storeRepository('repo', repository);

    const { state$ } = storage;
    const state = await firstValueFrom(state$);
    expect(state.dataCaches.length).toBe(1);
    expect(state.dataCaches[0].storageKey).toBe('cache');
    expect(state.dataCaches[0].dataCache).toBe(cache);

    expect(state.repositories.length).toBe(1);
    expect(state.repositories[0].repository).toBe(repository);
    expect(state.repositories[0].storageKey).toBe('repo');
  });

  test('clearAll', async () => {
    const { cache } = createDataCacheScenario<TestStoreCompartments>({
      a: {
        source: new ConfiguredDataSource(async () => []),
        defaultValue: [],
      },
      b: {
        source: new ConfiguredDataSource(async () => []),
        defaultValue: [],
      },
    });

    const repository = createRepository<VideoRegistry>({
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
    storage.store('cache', cache);
    storage.storeRepository('repo', repository);

    await cache.reloadAll();
    await repository.get('videos', '1');

    await storage.clearAll();

    const subject = new ApplicationState(storage);
    const state = await firstValueFrom(subject.createObservable());
    expect(state.compartments.every((x) => !x.initialized)).toBeTruthy();
  });
});
