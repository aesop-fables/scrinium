import { IServiceModule, ServiceModule } from '.';
import { AppStorage, IAppStorage } from '../AppStorage';
import { IServiceContainer } from '@aesop-fables/containr';

export const DataCacheServices = {
  AppStorage: 'appStorage',
};

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

export function useDataCache(modules: IAppStorageModule[] = []): IServiceModule {
  return new ServiceModule('dataCache', (services) => {
    const appStorage = new AppStorage();
    services.register<IAppStorage>(DataCacheServices.AppStorage, (container) => {
      modules.forEach((module) => module.configureAppStorage(appStorage, container));
      return appStorage;
    });
  });
}
