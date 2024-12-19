import { AppStorage, IAppStorage } from '../AppStorage';
import {
  BootstrappingServices,
  IActivator,
  IServiceContainer,
  IServiceModule,
  IServiceRegistry,
  ServiceCollection,
  ServiceModule,
  inject,
  injectContainer,
} from '@aesop-fables/containr';
import { ScriniumServices } from '../ScriniumServices';
import { IAppStorageModule } from './IAppStorageModule';

export function createDataCacheModule(
  middleware: (appStorage: IAppStorage, container: IServiceContainer) => void,
): IAppStorageModule {
  return {
    configureAppStorage: middleware,
  };
}

const appStorageModulesKey = 'scrinium/settings';

export interface ScriniumBootstrappingOptions {
  modules: IAppStorageModule[];
}

export class DataCacheRegistry implements IServiceRegistry {
  constructor(private readonly modules: IAppStorageModule[] = []) {}
  configureServices(services: ServiceCollection): void {
    services.singleton<ScriniumBootstrappingOptions>(appStorageModulesKey, { modules: this.modules });
    services.singleton<IAppStorage>(ScriniumServices.AppStorage, new AppStorage());
    services.arrayAutoResolve(BootstrappingServices.Activators, DataCacheActivator);
  }
}

export function useDataCache(modules: IAppStorageModule[] = []): IServiceModule {
  return new ServiceModule('dataCache', (services) => {
    services.include(new DataCacheRegistry(modules));
  });
}

export class DataCacheActivator implements IActivator {
  constructor(
    @injectContainer() private readonly container: IServiceContainer,
    @inject(ScriniumServices.AppStorage) private readonly appStorage: IAppStorage,
    @inject(appStorageModulesKey) private readonly settings: ScriniumBootstrappingOptions,
  ) {}

  activate(): void {
    this.settings.modules.forEach((module) => {
      try {
        module.configureAppStorage(this.appStorage, this.container);
      } catch (e) {
        console.log(module, e);
      }
    });
  }
}
