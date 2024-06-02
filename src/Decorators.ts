/* eslint-disable @typescript-eslint/no-explicit-any */
import { IInterceptor, interceptorChainFor, registerDependency } from '@aesop-fables/containr';
import { ScriniumServices } from './ScriniumServices';
import { IAppStorage } from './AppStorage';

export class DataCacheInterceptor implements IInterceptor<any> {
  constructor(private readonly key: string) {}

  resolve(currentValue: any | undefined): any {
    const appStorage = currentValue as IAppStorage;
    const cache = appStorage.retrieve<any>(this.key);
    if (typeof cache === 'undefined') {
      console.error(`@injectDataCache("${this.key}") returned undefined.`);
    }

    return cache;
  }
}

export class RepositoryInterceptor implements IInterceptor<any> {
  constructor(private readonly key: string) {}

  resolve(currentValue: any | undefined): any {
    const appStorage = currentValue as IAppStorage;
    const cache = appStorage.repository<any>(this.key);
    if (typeof cache === 'undefined') {
      console.error(`@injectRepository("${this.key}") returned undefined.`);
    }

    return cache;
  }
}

/**
 * @deprecated Use injectDataCache or injectRepository
 */
export function fromAppStorage(storageKey: string) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (constructor: Object, propertyKey: string | symbol | undefined, parameterIndex: number): void => {
    registerDependency(constructor, ScriniumServices.AppStorage, parameterIndex);
    const chain = interceptorChainFor(constructor, parameterIndex);
    chain.add(new DataCacheInterceptor(storageKey));
  };
}

/**
 * Retrieves a `DataCache` from app storage.
 * @param storageKey The app storage key
 * @returns DataCache
 */
export function injectDataCache(storageKey: string) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (constructor: Object, propertyKey: string | symbol | undefined, parameterIndex: number): void => {
    registerDependency(constructor, ScriniumServices.AppStorage, parameterIndex);
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
    registerDependency(constructor, ScriniumServices.AppStorage, parameterIndex);
    const chain = interceptorChainFor(constructor, parameterIndex);
    chain.add(new RepositoryInterceptor(storageKey));
  };
}
