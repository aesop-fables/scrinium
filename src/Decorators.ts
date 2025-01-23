/* eslint-disable @typescript-eslint/no-explicit-any */
import { IInterceptor, interceptorChainFor, registerDependency } from '@aesop-fables/containr';
import { ScriniumServices } from './ScriniumServices';
import { DataCatalog } from './DataStore';
import { DataStoreToken } from './DataStoreToken';

export class DataCacheInterceptor implements IInterceptor<any> {
  constructor(private readonly key: string) {}

  resolve(currentValue: any | undefined): any {
    const dataStore = currentValue as DataCatalog;
    const cache = dataStore.get(new DataStoreToken(this.key));
    if (typeof cache === 'undefined') {
      console.error(`@injectDataCache("${this.key}") returned undefined.`);
    }

    return cache;
  }
}

export class RepositoryInterceptor implements IInterceptor<any> {
  constructor(private readonly key: string) {}

  resolve(currentValue: any | undefined): any {
    const dataStore = currentValue as DataCatalog;
    const cache = dataStore.get(new DataStoreToken(this.key));
    if (typeof cache === 'undefined') {
      console.error(`@injectRepository("${this.key}") returned undefined.`);
    }

    return cache;
  }
}

/**
 * Retrieves a `DataCache` from app storage.
 * @param storageKey The app storage key
 * @returns DataCache
 */
export function injectDataCache(storageKey: string) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (constructor: Object, propertyKey: string | symbol | undefined, parameterIndex: number): void => {
    registerDependency(constructor, ScriniumServices.DataCatalog, parameterIndex);
    const chain = interceptorChainFor(constructor, parameterIndex);
    chain.add(new DataCacheInterceptor(storageKey));
  };
}

/**
 * Retrieves an `IRepository<T>` from app storage.
 * @param storageKey The app storage key
 * @returns IRepository<T>
 */
export function injectRepository(storageKey: string) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (constructor: Object, propertyKey: string | symbol | undefined, parameterIndex: number): void => {
    registerDependency(constructor, ScriniumServices.DataCatalog, parameterIndex);
    const chain = interceptorChainFor(constructor, parameterIndex);
    chain.add(new RepositoryInterceptor(storageKey));
  };
}
