import { IServiceContainer } from '@aesop-fables/containr';
import { DataCatalog } from '../DataCatalog';

export interface DataCatalogModule {
  configureDataCatalog(dataCatalog: DataCatalog, container: IServiceContainer): void;
}
