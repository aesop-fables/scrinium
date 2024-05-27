import { ConfiguredDataSource, DataCompartmentOptions } from '../Compartments';
import { DataCacheHash } from '../DataCacheHash';
import { createDataCacheScenario } from '../Utils';

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

describe('DataCacheHash', () => {
  test('Hash is repeatable', async () => {
    const { cache: cache1 } = createDataCacheScenario<TestStoreCompartments>({
      a: {
        source: new ConfiguredDataSource(async () => []),
        defaultValue: [],
      },
      b: {
        source: new ConfiguredDataSource(async () => []),
        defaultValue: [],
      },
    });

    const { cache: cache2 } = createDataCacheScenario<TestStoreCompartments>({
      a: {
        source: new ConfiguredDataSource(async () => []),
        defaultValue: [],
      },
      b: {
        source: new ConfiguredDataSource(async () => []),
        defaultValue: [],
      },
    });

    expect(DataCacheHash.from(cache1)).toBe(DataCacheHash.from(cache2));
  });

  test('defaultValue varies', async () => {
    const { cache: cache1 } = createDataCacheScenario<TestStoreCompartments>({
      a: {
        source: new ConfiguredDataSource(async () => []),
        defaultValue: [],
      },
      b: {
        source: new ConfiguredDataSource(async () => []),
        defaultValue: [],
      },
    });

    const { cache: cache2 } = createDataCacheScenario<TestStoreCompartments>({
      a: {
        source: new ConfiguredDataSource(async () => []),
        defaultValue: [],
      },
      b: {
        source: new ConfiguredDataSource(async () => []),
        defaultValue: [{ email: 'loaded@loaded.com' }],
      },
    });

    expect(DataCacheHash.from(cache1)).not.toBe(DataCacheHash.from(cache2));
  });
});
