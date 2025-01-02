/* eslint-disable @typescript-eslint/no-explicit-any */
import { IServiceContainer, Newable } from '@aesop-fables/containr';
import { IDataCache } from '../DataCache';
import { IRepository } from '../Repository';
import { IAppStorageModule } from './IAppStorageModule';

export type AppStorageRegistrations = {
  caches?: IDataCache[];
  repositories?: IRepository<any>[];
};

export type AppStorageModuleBuilder = (container: IServiceContainer) => AppStorageRegistrations;

export interface IAppStorageRegistration {
  defineData(): AppStorageRegistrations;
}

export function createAppStorageModule(builder: AppStorageModuleBuilder): IAppStorageModule {
  return {
    configureAppStorage: (storage, container) => {
      const { caches = [], repositories = [] } = builder(container);
      caches.forEach((cache) => storage.store(cache));
      repositories.forEach((repo) => storage.storeRepository(repo));
    },
  };
}

export function createAppStorageRegistrations(newable: Newable<IAppStorageRegistration>): IAppStorageModule {
  return createAppStorageModule((container) => {
    const instance = container.resolve(newable);
    return instance.defineData();
  });
}
