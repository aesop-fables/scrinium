/* eslint-disable @typescript-eslint/no-explicit-any */
import { cacheForSeconds, DataCompartmentOptions } from '../Compartments';
import { ConfiguredDataSource } from '../ConfiguredDataSource';
import { createDataCache, DataCache } from '../DataCache';
import { DataCompartment } from '../DataCompartment';
import { DataCatalog, DataStore } from '../DataStore';
import { DataStoreToken } from '../DataStoreToken';
import { createSchema } from '../Schema';
import { wait } from '../tasks';

describe('DataStore Integration', () => {
  type TestCompartments = {
    compartmentA: DataCompartmentOptions<string>;
    compartmentB: DataCompartmentOptions<string>;
    compartmentC: DataCompartmentOptions<string>;
    compartmentD: DataCompartmentOptions<string>;
  };

  const testToken = new DataStoreToken('test');

  let cache: DataCache<TestCompartments>;

  beforeEach(() => {
    cache = createDataCache(testToken, {
      compartmentA: {
        source: new ConfiguredDataSource(async () => 'A'),
        defaultValue: 'A',
        retention: {
          policies: [cacheForSeconds(10)],
        },
      },
      compartmentB: {
        source: new ConfiguredDataSource(async () => 'B'),
        defaultValue: '',
        retention: {
          policies: [cacheForSeconds(10)],
        },
      },
      compartmentC: {
        source: new ConfiguredDataSource(async () => 'C'),
        defaultValue: '',
        retention: {
          policies: [cacheForSeconds(10)],
        },
      },
      compartmentD: {
        source: new ConfiguredDataSource(async () => 'D'),
        defaultValue: '',
        retention: {
          policies: [cacheForSeconds(10)],
        },
      },
    });
  });

  test('Simple invalidation', async () => {
    const values = new DataCatalog();
    values.registerCache(cache);
    const store = new DataStore(values);

    const schema = createSchema((builder) => {
      builder
        .source(testToken.compartment<TestCompartments>('compartmentA'))
        .invalidatesCompartment(testToken.compartment<TestCompartments>('compartmentB'));

      builder
        .source(testToken.compartment<TestCompartments>('compartmentB'))
        .invalidatesCompartment(testToken.compartment<TestCompartments>('compartmentD'));
    });

    store.apply(schema);

    await cache.modify('compartmentA', async (value) => {
      return value + 'A';
    });

    await wait(200);

    const compartmentB = cache.findCompartment('compartmentB') as DataCompartment<string>;
    expect(compartmentB.isExpired).toBeTruthy();

    const compartmentD = cache.findCompartment('compartmentD') as DataCompartment<string>;
    expect(compartmentD.isExpired).toBeTruthy();

    const compartmentC = cache.findCompartment('compartmentC') as DataCompartment<string>;
    expect(compartmentC.isExpired).toBeFalsy();
  });
});
