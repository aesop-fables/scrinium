/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataCompartmentOptions } from '../Compartments';
import { ConfiguredDataSource } from '../ConfiguredDataSource';
import { createDataCache, DataCache } from '../DataCache';
import { DataCatalog, DataStore } from '../DataStore';
import { DataStoreToken } from '../DataStoreToken';
import { createRepository, Repository } from '../Repository';
import { firstValueFrom } from 'rxjs';

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

    values.registerCache(cache);
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

    values.registerRepository(repository);
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

  test('Clears all data caches', async () => {
    const cacheToken1 = new DataStoreToken('cache1');
    const cacheToken2 = new DataStoreToken('cache2');
    const repoToken1 = new DataStoreToken('repo1');
    const repoToken2 = new DataStoreToken('repo2');

    const cache1 = { token: cacheToken1 } as DataCache<TestCompartments>;
    const cache2 = { token: cacheToken2 } as DataCache<TestCompartments>;
    const repo1 = { token: repoToken1 } as Repository<TestCompartments>;
    const repo2 = { token: repoToken2 } as Repository<TestCompartments>;

    const values = new DataCatalog();
    values.registerCache(cache1);
    values.registerCache(cache2);
    values.registerRepository(repo1);
    values.registerRepository(repo2);

    const store = new DataStore(values);
    await store.clearDataCaches();

    expect(cache1.resetAll).toHaveBeenCalled();
    expect(cache2.resetAll).toHaveBeenCalled();
    
    expect(repo1.reset).not.toHaveBeenCalled();
    expect(repo2.reset).not.toHaveBeenCalled();
  });

  test('Clears all repositories', async () => {
    const cacheToken1 = new DataStoreToken('cache1');
    const cacheToken2 = new DataStoreToken('cache2');
    const repoToken1 = new DataStoreToken('repo1');
    const repoToken2 = new DataStoreToken('repo2');

    const cache1 = { token: cacheToken1 } as DataCache<TestCompartments>;
    const cache2 = { token: cacheToken2 } as DataCache<TestCompartments>;
    const repo1 = { token: repoToken1 } as Repository<TestCompartments>;
    const repo2 = { token: repoToken2 } as Repository<TestCompartments>;

    const values = new DataCatalog();
    values.registerCache(cache1);
    values.registerCache(cache2);
    values.registerRepository(repo1);
    values.registerRepository(repo2);

    const store = new DataStore(values);
    await store.clearRepositories();

    expect(repo1.reset).toHaveBeenCalled();
    expect(repo2.reset).toHaveBeenCalled();

    expect(cache1.resetAll).not.toHaveBeenCalled();
    expect(cache2.resetAll).not.toHaveBeenCalled();
  });

  test('Clears all caches and repositories', async () => {
    const cacheToken1 = new DataStoreToken('cache1');
    const cacheToken2 = new DataStoreToken('cache2');
    const repoToken1 = new DataStoreToken('repo1');
    const repoToken2 = new DataStoreToken('repo2');

    const cache1 = { token: cacheToken1 } as DataCache<TestCompartments>;
    const cache2 = { token: cacheToken2 } as DataCache<TestCompartments>;
    const repo1 = { token: repoToken1 } as Repository<TestCompartments>;
    const repo2 = { token: repoToken2 } as Repository<TestCompartments>;

    const values = new DataCatalog();
    values.registerCache(cache1);
    values.registerCache(cache2);
    values.registerRepository(repo1);
    values.registerRepository(repo2);

    const store = new DataStore(values);
    await store.clearAll();

    expect(repo1.reset).toHaveBeenCalled();
    expect(repo2.reset).toHaveBeenCalled();

    expect(cache1.resetAll).toHaveBeenCalled();
    expect(cache2.resetAll).toHaveBeenCalled();
  });

  test('Builds up state', async () => {
    const cacheToken1 = new DataStoreToken('cache1');
    const cacheToken2 = new DataStoreToken('cache2');
    const repoToken1 = new DataStoreToken('repo1');
    const repoToken2 = new DataStoreToken('repo2');

    const cache1 = { token: cacheToken1 } as DataCache<TestCompartments>;
    const cache2 = { token: cacheToken2 } as DataCache<TestCompartments>;
    const repo1 = { token: repoToken1 } as Repository<TestCompartments>;
    const repo2 = { token: repoToken2 } as Repository<TestCompartments>;

    const values = new DataCatalog();
    values.registerCache(cache1);
    values.registerCache(cache2);
    values.registerRepository(repo1);
    values.registerRepository(repo2);

    const store = new DataStore(values);
    const { state$ } = store;
    const state = await firstValueFrom(state$);
    expect(state.dataCaches.length).toBe(2);
    expect(state.dataCaches[0]).toBe(cache1);
    expect(state.dataCaches[1]).toBe(cache2);

    expect(state.repositories.length).toBe(2);
    expect(state.repositories[0]).toBe(repo1);
    expect(state.repositories[1]).toBe(repo2);
  });

  type TestCompartments = {
    foo: DataCompartmentOptions<string>;
  };
});
