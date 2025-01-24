/* eslint-disable @typescript-eslint/no-explicit-any */
import { combineLatest, map, Observable, of, Subscription } from 'rxjs';
import { DataCache, IDataCache } from './DataCache';
import { DataStoreToken } from './DataStoreToken';
import { ICompartmentStorage } from './ICompartmentStorage';
import { IRepository, Repository } from './Repository';
import { Schema } from './Schema';
import { DataCompartment } from './DataCompartment';

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
  private schema?: Schema;

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

  public apply(schema: Schema) {
    this.schema = schema;
  }

  // public apply(schema: Schema) {
  //   this.schema = schema;
  //   // regen the subscriptions

  //   for (let i = 0; i < schema.observableTokens.length; i++) {
  //     const token = schema.observableTokens[i];
  //     const type = this.dataCatalog.describe(token);
  //     if (type === 'repository') {
  //       console.log(`Ignoring repository ${token.key}`);
  //       continue;
  //     }

  //     const cache = this.cache(token);
  // Need the abstract way to point to a compartment given a token
  // Also need a function to determine which tokens are related to a given token
  //   }
  // }
}

type CatalogType = 'cache' | 'repository';

type Catalog = {
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

type ChangeRecord<T> = {
  previous?: T;
  current: T;
};

type ChangeSubscription<T> = (change: ChangeRecord<T>) => void;

interface DataCatalogObserver<T = any> {
  subscribe(catalog: DataCatalog, onChange: ChangeSubscription<T>): Subscription;
}

export class DataCatalogPath {
  constructor(private readonly observer: DataCatalogObserver) {}

  addChangeListener<T>(catalog: DataCatalog, onChange: ChangeSubscription<T>): Subscription {
    return this.observer.subscribe(catalog, onChange);
  }

  static fromCache(token: DataStoreToken): DataCatalogPath {
    console.log(token);
    throw new Error('Method not implemented.');
  }
}
