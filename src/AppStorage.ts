/* eslint-disable @typescript-eslint/no-explicit-any */
import { AppStorageToken } from './AppStorageToken';
import { DataCache, IDataCache } from './DataCache';
import { IRepository } from './Repository';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';

export interface IdentifiedCache {
  storageKey: string;
  dataCache: IDataCache;
}

export interface IdentifiedRepository<T = any> {
  storageKey: string;
  repository: IRepository<T>;
}

export interface IAppStorageState {
  dataCaches: IdentifiedCache[];
  repositories: IdentifiedRepository<any>[];
}

export interface IAppStorage {
  clearAll(): void;
  clearDataCaches(): void;
  clearRepositories(): void;

  repository<Policy>(token: AppStorageToken): IRepository<Policy>;
  retrieve<Policy>(token: AppStorageToken): DataCache<Policy>;
  state$: Observable<IAppStorageState>;
  store<Policy>(value: DataCache<Policy>): void;
  storeRepository<Registry>(value: IRepository<Registry>): void;
}

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

  store<Policy>(value: DataCache<Policy>): void {
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
            .map(([storageKey, dataCache]) => ({ storageKey, dataCache })),
          repositories: Object.entries(repositories).map(([storageKey, repository]) => ({ storageKey, repository })),
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
