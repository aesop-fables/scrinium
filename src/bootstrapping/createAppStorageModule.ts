/* eslint-disable @typescript-eslint/no-explicit-any */
import { IServiceContainer, Newable } from '@aesop-fables/containr';
import { DataCache } from '../DataCache';
import { Repository } from '../Repository';
import { IAppStorageModule } from './IAppStorageModule';

export type AppStorageRegistrations = {
  caches?: Record<string, DataCache<any>>;
  repositories?: Record<string, Repository<any>>;
};

export type AppStorageModuleBuilder = (container: IServiceContainer) => AppStorageRegistrations;

export interface IAppStorageRegistration {
  defineData(): AppStorageRegistrations;
}

export function createAppStorageModule(builder: AppStorageModuleBuilder): IAppStorageModule {
  return {
    configureAppStorage: (storage, container) => {
      const { caches = {}, repositories = {} } = builder(container);
      Object.keys(caches).forEach((key) => {
        storage.store(key, caches[key]);
      });
      Object.keys(repositories).forEach((key) => {
        storage.storeRepository(key, repositories[key]);
      });
    },
  };
}

export function createAppStorageRegistrations(newable: Newable<IAppStorageRegistration>): IAppStorageModule {
  return createAppStorageModule((container) => {
    const instance = container.resolve(newable);
    return instance.defineData();
  });
}
