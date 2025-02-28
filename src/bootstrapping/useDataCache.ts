import { DataStore } from '../DataStore';
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
import { DataCatalog } from '../DataCatalog';
import { createSchema, SchemaBuilder } from '../Schema';
import { ApplicationCacheManager } from '../Caching';
import { systemClock } from '../System';

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
  schema?: (builder: SchemaBuilder) => void;
}

export class DataCacheRegistry implements IServiceRegistry {
  constructor(private readonly options: ScriniumBootstrappingOptions) {}

  configureServices(services: ServiceCollection): void {
    services.singleton<ScriniumBootstrappingOptions>(dataStoreModulesKey, this.options);
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
    @inject(ScriniumServices.DataStore) private readonly store: DataStore,
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

    if (this.settings.schema) {
      const schema = createSchema(this.settings.schema);
      this.store.apply(schema, ApplicationCacheManager.instance, systemClock);
    }
  }
}
