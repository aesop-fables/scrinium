/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataCompartmentOptions } from '../Compartments';
import { ConfiguredDataSource } from '../ConfiguredDataSource';
import { createDataCache } from '../DataCache';
import { DataCatalog, DataStore } from '../DataStore';
import { DataStoreToken } from '../DataStoreToken';
import { createRepository } from '../Repository';

describe('DataStore', () => {
  const testToken = new DataStoreToken('test');

  test('Retrieves data cache', () => {
    const values = new DataCatalog();
    const cache = createDataCache<TestCompartments>(testToken, {
      foo: {
        defaultValue: '',
        source: new ConfiguredDataSource(async () => 'bar'),
      },
    });

    values.registerCache(testToken, cache);
    const store = new DataStore(values);
    expect(store.cache(testToken)).toBe(cache);
  });

  test('Retrieves repository', () => {
    const values = new DataCatalog();
    const repository = createRepository<TestCompartments>(testToken, {
      foo: {
        defaultValue: '',
        source: new ConfiguredDataSource(async () => 'bar'),
      },
    });

    values.registerRepository(testToken, repository);
    const store = new DataStore(values);
    expect(store.repository(testToken)).toBe(repository);
  });

  test('Returns undefined when cache does not exist', () => {
    const values = new DataCatalog();
    const store = new DataStore(values);
    expect(store.cache(testToken)).toBeUndefined();
  });

  test('Returns undefined when repository does not exist', () => {
    const values = new DataCatalog();
    const store = new DataStore(values);
    expect(store.repository(testToken)).toBeUndefined();
  });

  type TestCompartments = {
    foo: DataCompartmentOptions<string>;
  };
});
