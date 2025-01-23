import { DataCatalog, DataStore } from '../DataStore';
import {
  BootstrappingServices,
  IActivator,
  IServiceContainer,
  IServiceRegistry,
  ServiceCollection,
  inject,
  injectContainer,
} from '@aesop-fables/containr';
import { ScriniumServices } from '../ScriniumServices';
import { DataCatalogModule } from './DataCatalogModule';

export function createDataCatalogModule(
  middleware: (dataCatalog: DataCatalog, container: IServiceContainer) => void,
): DataCatalogModule {
  return {
    configureDataCatalog: middleware,
  };
}

const dataStoreModulesKey = 'scrinium/settings';

export interface ScriniumBootstrappingOptions {
  modules: DataCatalogModule[];
}

export class DataCacheRegistry implements IServiceRegistry {
  constructor(private readonly modules: DataCatalogModule[] = []) {}
  configureServices(services: ServiceCollection): void {
    services.singleton<ScriniumBootstrappingOptions>(dataStoreModulesKey, { modules: this.modules });
    services.arrayAutoResolve(BootstrappingServices.Activators, DataCatalogActivator);

    const catalog = new DataCatalog();
    const store = new DataStore(catalog);

    services.singleton(ScriniumServices.DataCatalog, catalog);
    services.singleton(ScriniumServices.DataStore, store);
  }
}

export class DataCatalogActivator implements IActivator {
  constructor(
    @injectContainer() private readonly container: IServiceContainer,
    @inject(ScriniumServices.DataCatalog) private readonly dataCatalog: DataCatalog,
    @inject(dataStoreModulesKey) private readonly settings: ScriniumBootstrappingOptions,
  ) {}

  activate(): void {
    this.settings.modules.forEach((mod) => {
      try {
        mod.configureDataCatalog(this.dataCatalog, this.container);
      } catch (e) {
        console.log(mod, e);
      }
    });
  }
}
