/* eslint-disable @typescript-eslint/no-explicit-any */
import { combineLatest, map, Observable, of } from 'rxjs';
import { DataCache, IDataCache } from './DataCache';
import { DataStoreToken } from './DataStoreToken';
import { ICompartmentStorage } from './ICompartmentStorage';
import { IRepository, Repository } from './Repository';

// Essentially an in-memory database
// First pass is JUST a replacement for AppStorage
// Then we'll layer in the schema and triggers

export type DataStoreState = {
  dataCaches: IDataCache[];
  repositories: IRepository<any>[];
};

/**
 * Provides a managed data store for caching and repositories as well as managing their relationships.
 */
export class DataStore {
  constructor(private readonly dataCatalog: DataCatalog) {}

  public cache<Compartments>(token: DataStoreToken): DataCache<Compartments> {
    return this.dataCatalog.get(token) as DataCache<Compartments>;
  }

  public repository<Registry>(token: DataStoreToken): IRepository<Registry> {
    return this.dataCatalog.get(token) as IRepository<Registry>;
  }

  async clearDataCaches(): Promise<void> {
    const { caches } = this.dataCatalog;
    for (let i = 0; i < caches.length; i++) {
      const cache = caches[i] as DataCache<any>;
      await cache.resetAll();
    }
  }

  async clearRepositories(): Promise<void> {
    const { repositories } = this.dataCatalog;
    for (let i = 0; i < repositories.length; i++) {
      const repository = repositories[i] as Repository<any>;
      await repository.reset();
    }
  }

  async clearAll(): Promise<void> {
    await Promise.all([this.clearRepositories(), this.clearDataCaches()]);
  }

  get state$(): Observable<DataStoreState> {
    const caches = of(this.dataCatalog.caches);
    const repositories = of(this.dataCatalog.repositories);

    return combineLatest([repositories, caches]).pipe(
      map(([repositories, values]) => {
        return {
          dataCaches: Object.entries(values).map(([, dataCache]) => dataCache),
          repositories: Object.entries(repositories).map(([, repository]) => repository),
        };
      }),
    );
  }
}

type CatalogType = 'cache' | 'repository';

type Catalog = {
  type: CatalogType;
  storage: ICompartmentStorage;
};

export class DataCatalog {
  private readonly values: Map<DataStoreToken, Catalog> = new Map();

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
    this.values.set(cache.token, { type: 'cache', storage: cache });
  }

  public registerRepository<Compartments>(repository: IRepository<Compartments>): void {
    this.values.set(repository.token, { type: 'repository', storage: repository });
  }

  public get(token: DataStoreToken): ICompartmentStorage | undefined {
    return this.values.get(token)?.storage;
  }

  public describe(token: DataStoreToken): CatalogType | undefined {
    return this.values.get(token)?.type;
  }
}
