import { AppStorage } from '../AppStorage';
import { ConfiguredDataSource, DataCompartmentOptions } from '../Compartments';
import { ConfiguredEntityResolver, createRepository } from '../Repository';
import { createDataCacheScenario } from '../Utils';
import { Video, VideoMetadata, VideoRegistry } from './Common';
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

    const { state } = storage;
    expect(state.dataCaches.length).toBe(1);
    expect(state.dataCaches[0]).toBe(cache);

    expect(state.repositories.length).toBe(1);
    expect(state.repositories[0]).toBe(repository);
  });
});