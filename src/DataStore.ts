/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataCache } from './DataCache';
import { DataStoreToken } from './DataStoreToken';
import { ICompartmentStorage } from './ICompartmentStorage';
import { IRepository } from './Repository';

// Essentially an in-memory database
// First pass is JUST a replacement for AppStorage
// Then we'll layer in the schema and triggers
export class DataStore {
  constructor(private readonly dataCatalog: DataCatalog) {}

  public cache<Compartments>(token: DataStoreToken): DataCache<Compartments> {
    return this.dataCatalog.get(token) as DataCache<Compartments>;
  }

  public repository<Registry>(token: DataStoreToken): IRepository<Registry> {
    return this.dataCatalog.get(token) as IRepository<Registry>;
  }
}

type CatalogType = 'cache' | 'repository';

type Catalog = {
  type: CatalogType;
  storage: ICompartmentStorage;
};

export class DataCatalog {
  private readonly values: Map<DataStoreToken, Catalog> = new Map();

  public registerCache<Compartments>(token: DataStoreToken, cache: DataCache<Compartments>): void {
    this.values.set(token, { type: 'cache', storage: cache });
  }

  public registerRepository<Compartments>(token: DataStoreToken, repository: IRepository<Compartments>): void {
    this.values.set(token, { type: 'repository', storage: repository });
  }

  public get(token: DataStoreToken): ICompartmentStorage | undefined {
    return this.values.get(token)?.storage;
  }

  public describe(token: DataStoreToken): CatalogType | undefined {
    return this.values.get(token)?.type;
  }
}
