import { AppStorage, IAppStorage } from '../AppStorage';
import {
  IServiceContainer,
  IServiceModule,
  IServiceRegistry,
  ServiceCollection,
  ServiceModule,
} from '@aesop-fables/containr';

export const DataCacheServices = {
  AppStorage: '@aesop-fables/scrinium/appStorage',
  SubjectResolver: '@aesop-fables/scrinium/subjectResolver',
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

export class DataCacheRegistry implements IServiceRegistry {
  constructor(private readonly modules: IAppStorageModule[] = []) {}
  configureServices(services: ServiceCollection): void {
    services.register<IAppStorage>(DataCacheServices.AppStorage, (container) => {
      const appStorage = new AppStorage();
      this.modules.forEach((module) => module.configureAppStorage(appStorage, container));
      return appStorage;
    });
  }
}

export function useDataCache(modules: IAppStorageModule[] = []): IServiceModule {
  return new ServiceModule('dataCache', (services) => {
    services.include(new DataCacheRegistry(modules));
  });
}
