/* eslint-disable @typescript-eslint/no-explicit-any */
import { IInterceptor, interceptorChainFor, registerDependency } from '@aesop-fables/containr';
import { DataCache } from './DataCache';
import { IRepository } from './Repository';
import { ScriniumServices } from './ScriniumServices';

export interface IAppStorage {
  repository<Policy>(key: string): IRepository<Policy>;
  retrieve<Policy>(key: string): DataCache<Policy>;
  store<Policy>(key: string, value: DataCache<Policy> | IRepository<Policy>): void;
}

export class AppStorage implements IAppStorage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private values: Record<string, any> = {};

  repository<Policy>(key: string): IRepository<Policy> {
    return this.values[key] as IRepository<Policy>;
  }

  retrieve<Policy>(key: string): DataCache<Policy> {
    return this.values[key] as DataCache<Policy>;
  }

  store<Policy>(key: string, value: DataCache<Policy> | IRepository<Policy>): void {
    this.values[key] = value;
  }
}

export class FromAppStorageInterceptor implements IInterceptor<any> {
  constructor(private readonly key: string) {}

  resolve(currentValue: any | undefined): any {
    const appStorage = currentValue as IAppStorage;
    const cache = appStorage.retrieve<any>(this.key);
    if (typeof cache === 'undefined') {
      console.error(`@fromAppStorage("${this.key}") returned undefined.`);
    }

    return cache;
  }
}

export function fromAppStorage(storageKey: string) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (constructor: Object, propertyKey: string | symbol | undefined, parameterIndex: number): void => {
    registerDependency(constructor, ScriniumServices.AppStorage, parameterIndex);
    const chain = interceptorChainFor(constructor, parameterIndex);
    chain.add(new FromAppStorageInterceptor(storageKey));
  };
}
