import { IServiceContainer } from '@aesop-fables/containr';
import { DataCatalog } from '../DataStore';

export interface DataCatalogModule {
  configureDataCatalog(dataCatalog: DataCatalog, container: IServiceContainer): void;
}
