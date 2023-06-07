import { AppStorage, IAppStorage } from '../AppStorage';
import {
  IServiceContainer,
  IServiceModule,
  IServiceRegistry,
  Scopes,
  ServiceCollection,
  ServiceModule,
} from '@aesop-fables/containr';
import { DataCacheServices } from './DataCacheServices';

export interface IAppStorageModule {
  configureAppStorage(appStorage: IAppStorage, container: IServiceContainer): void;
}

export function createDataCacheModule(
  middleware: (appStorage: IAppStorage, container: IServiceContainer) => void,
): IAppStorageModule {
  return {
    configureAppStorage: middleware,
  };
}

export class DataCacheRegistry implements IServiceRegistry {
  constructor(private readonly modules: IAppStorageModule[] = []) {}
  configureServices(services: ServiceCollection): void {
    services.factory<IAppStorage>(
      DataCacheServices.AppStorage,
      (container) => {
        const appStorage = new AppStorage();
        this.modules.forEach((module) => module.configureAppStorage(appStorage, container));
        return appStorage;
      },
      Scopes.Singleton,
    );
  }
}

export function useDataCache(modules: IAppStorageModule[] = []): IServiceModule {
  return new ServiceModule('dataCache', (services) => {
    services.include(new DataCacheRegistry(modules));
  });
}
