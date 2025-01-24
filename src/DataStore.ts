/* eslint-disable @typescript-eslint/no-explicit-any */
import { combineLatest, map, Observable, of } from 'rxjs';
import { DataCache, IDataCache } from './DataCache';
import { DataStoreToken } from './DataStoreToken';
import { IRepository, Repository } from './Repository';
import { Schema } from './Schema';
import { DataCatalog } from './DataCatalog';
import { DataCatalogPath } from './DataCatalogPath';
import { TriggerContext } from './IDataTrigger';
import { IApplicationCacheManager } from './Caching';
import { ISystemClock } from './System';

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

  // public apply(schema: Schema) {
  //   this.schema = schema;
  // }

  // TODO -- Need to move the cache to the constructor but don't feel like fixing the compiler errors yet
  public apply(schema: Schema, cache: IApplicationCacheManager, clock: ISystemClock) {
    this.schema = schema;
    // regen the subscriptions

    for (let i = 0; i < schema.observableTokens.length; i++) {
      const token = schema.observableTokens[i];
      const type = this.dataCatalog.describe(token);
      if (type === 'repository') {
        console.log(`Ignoring repository ${token.key}`);
        continue;
      }

      const path = DataCatalogPath.fromCacheCompartment(token);
      const triggers = schema.triggersFor(token);
      path.addChangeListener(this.dataCatalog, (record) => {
        const context = new TriggerContext(cache, record, this, clock);
        for (let j = 0; j < triggers.length; j++) {
          const trigger = triggers[j];
          trigger.onCompartmentChanged(context);
        }
      });
    }
  }
}
