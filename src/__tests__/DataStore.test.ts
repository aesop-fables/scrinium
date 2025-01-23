/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataCompartmentOptions } from '../Compartments';
import { ConfiguredDataSource } from '../ConfiguredDataSource';
import { createDataCache } from '../DataCache';
import { DataStore } from '../DataStore';
import { DataStoreToken } from '../DataStoreToken';
import { createRepository } from '../Repository';

describe('DataStore', () => {
  const testToken = new DataStoreToken('test');

  test('Retrieves data cache', () => {
    const values = new Map<DataStoreToken, any>();
    const cache = createDataCache<TestCompartments>(testToken, {
      foo: {
        defaultValue: '',
        source: new ConfiguredDataSource(async () => 'bar'),
      },
    });

    values.set(testToken, cache);
    const store = new DataStore(values);
    expect(store.cache(testToken)).toBe(cache);
  });

  test('Retrieves repository', () => {
    const values = new Map<DataStoreToken, any>();
    const repository = createRepository<TestCompartments>(testToken, {
      foo: {
        defaultValue: '',
        source: new ConfiguredDataSource(async () => 'bar'),
      },
    });

    values.set(testToken, repository);
    const store = new DataStore(values);
    expect(store.repository(testToken)).toBe(repository);
  });

  test('Returns undefined when cache does not exist', () => {
    const values = new Map<DataStoreToken, any>();
    const store = new DataStore(values);
    expect(store.cache(testToken)).toBeUndefined();
  });

  test('Returns undefined when repository does not exist', () => {
    const values = new Map<DataStoreToken, any>();
    const store = new DataStore(values);
    expect(store.repository(testToken)).toBeUndefined();
  });

  type TestCompartments = {
    foo: DataCompartmentOptions<string>;
  };
});
