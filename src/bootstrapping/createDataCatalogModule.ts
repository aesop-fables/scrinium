/* eslint-disable @typescript-eslint/no-explicit-any */
import { IServiceContainer, Newable } from '@aesop-fables/containr';
import { IDataCache } from '../DataCache';
import { IRepository } from '../Repository';
import { DataCatalogModule } from './DataCatalogModule';

export type DataCatalogRegistrations = {
  caches?: IDataCache[];
  repositories?: IRepository<any>[];
};

export type DataCatalogModuleBuilder = (container: IServiceContainer) => DataCatalogRegistrations;

export interface DataCatalogRegistration {
  defineData(): DataCatalogRegistrations;
}

export function createInlineDataCatalogModule(builder: DataCatalogModuleBuilder): DataCatalogModule {
  return {
    configureDataCatalog: (catalog, container) => {
      const { caches = [], repositories = [] } = builder(container);
      caches.forEach((cache) => catalog.registerCache(cache));
      repositories.forEach((repo) => catalog.registerRepository(repo));
    },
  };
}

export function createDataModule(newable: Newable<DataCatalogRegistration>): DataCatalogModule {
  return createInlineDataCatalogModule((container) => {
    const instance = container.resolve(newable);
    return instance.defineData();
  });
}
