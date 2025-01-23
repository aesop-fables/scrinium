/* eslint-disable @typescript-eslint/no-explicit-any */
import { AppStorageToken } from './AppStorageToken';
import { DataCache, IDataCache } from './DataCache';
import { IRepository } from './Repository';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';

export interface IAppStorageState {
  dataCaches: IDataCache[];
  repositories: IRepository<any>[];
}

export interface IAppStorage {
  clearAll(): void;
  clearDataCaches(): void;
  clearRepositories(): void;

  repository<Policy>(token: AppStorageToken): IRepository<Policy>;
  retrieve<Policy>(token: AppStorageToken): DataCache<Policy>;
  state$: Observable<IAppStorageState>;
  store(value: IDataCache): void;
  storeRepository<Registry>(value: IRepository<Registry>): void;
}

// The data model really lives outside of the storage...
// What could that be called? A data model? A data cache?

export class AppStorage implements IAppStorage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly values = new BehaviorSubject<Record<string, any>>({});
  private readonly repositories = new BehaviorSubject<Record<string, IRepository<any>>>({});

  repository<Policy>(token: AppStorageToken): IRepository<Policy> {
    return this.repositories.value[token.key] as IRepository<Policy>;
  }

  retrieve<Policy>(token: AppStorageToken): DataCache<Policy> {
    return this.values.value[token.key] as DataCache<Policy>;
  }

  store(value: IDataCache): void {
    this.values.next({
      ...this.values.value,
      [value.token.key]: value,
    });
  }

  storeRepository<Registry>(value: IRepository<Registry>): void {
    this.repositories.next({
      ...this.repositories.value,
      [value.token.key]: value,
    });
  }

  get state$(): Observable<IAppStorageState> {
    return combineLatest([this.repositories, this.values]).pipe(
      map(([repositories, values]) => {
        const repositoryKeys = Object.keys(repositories);
        return {
          dataCaches: Object.entries(values)
            .filter(([x]) => repositoryKeys.indexOf(x) === -1)
            .map(([, dataCache]) => dataCache),
          repositories: Object.entries(repositories).map(([, repository]) => repository),
        };
      }),
    );
  }

  async clearAll(): Promise<void> {
    this.clearRepositories();
    await this.clearDataCaches();
  }

  async clearDataCaches(): Promise<void> {
    await Promise.all(
      Object.values(this.values.value).map(async (cache) => {
        if (typeof cache.resetAll === 'function') {
          await cache.resetAll();
        }

        return Promise.resolve();
      }),
    );
  }

  clearRepositories(): void {
    Object.values(this.repositories.value).forEach((repo) => repo.reset());
  }
}
