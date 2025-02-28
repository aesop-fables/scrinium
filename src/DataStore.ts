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
import { EventEnvelope } from './DataCompartment';

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
  private _schema?: Schema;

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

  async reset(token: DataStoreToken): Promise<void> {
    let path = this.dataCatalog.describe(token) === 'cache' ? DataCatalogPath.fromCacheCompartment(token) : null;
    if (!path && token.parent) {
      path = this.dataCatalog.describe(token.parent) === 'cache' ? DataCatalogPath.fromCacheCompartment(token) : null;
    }

    if (!path) {
      return;
    }

    await path.reset(this.dataCatalog);
  }

  get schema(): Schema | undefined {
    return this._schema;
  }

  public apply(schema: Schema, cache: IApplicationCacheManager, clock: ISystemClock) {
    this._schema = schema;

    const observableTokens = schema.observableTokens;
    const visitedTokens: string[] = [];

    while (observableTokens.length > 0) {
      const token = observableTokens.shift();
      if (!token || visitedTokens.includes(token.key)) {
        break;
      }

      visitedTokens.push(token.key);
      const type = this.dataCatalog.describe(token);
      if (type === 'repository') {
        console.log(`Ignoring repository ${token.key}`);
        continue;
      }

      const path = DataCatalogPath.fromCacheCompartment(token);
      const triggers = schema.triggersFor(token);
      const onCompartmentEventRaised = (envelope: EventEnvelope) => {
        const context = new TriggerContext(cache, envelope, this, clock);
        for (let j = 0; j < triggers.length; j++) {
          const trigger = triggers[j];
          trigger.onCompartmentEventRaised(context);

          trigger.tokens.forEach((t) => {
            if (!visitedTokens.includes(t.key)) {
              observableTokens.push(t);
            }
          });
        }
      };

      path.addEventListener(this.dataCatalog, 'change', onCompartmentEventRaised);
      path.addEventListener(this.dataCatalog, 'reset', onCompartmentEventRaised);
    }
  }
}
