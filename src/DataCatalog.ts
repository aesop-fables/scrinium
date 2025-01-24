/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataCache, IDataCache } from './DataCache';
import { DataStoreToken } from './DataStoreToken';
import { ICompartmentStorage } from './ICompartmentStorage';
import { IRepository } from './Repository';

export type CatalogType = 'cache' | 'repository';

export type Catalog = {
  type: CatalogType;
  storage: ICompartmentStorage;
};

export class DataCatalog {
  private readonly values: Map<string, Catalog> = new Map();

  public get caches() {
    return Array.from(this.values.values())
      .filter((x) => x.type === 'cache')
      .map((x) => x.storage as DataCache<any>);
  }

  public get repositories() {
    return Array.from(this.values.values())
      .filter((x) => x.type === 'repository')
      .map((x) => x.storage as IRepository<any>);
  }

  public registerCache(cache: IDataCache): void {
    this.values.set(cache.token.key, { type: 'cache', storage: cache });
  }

  public registerRepository<Compartments>(repository: IRepository<Compartments>): void {
    this.values.set(repository.token.key, { type: 'repository', storage: repository });
  }

  public get(token: DataStoreToken): ICompartmentStorage | undefined {
    return this.values.get(token.key)?.storage;
  }

  public describe(token: DataStoreToken): CatalogType | undefined {
    return this.values.get(token.key)?.type;
  }
}
