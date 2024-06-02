/* eslint-disable @typescript-eslint/no-explicit-any */
import { IInterceptor, interceptorChainFor, registerDependency } from '@aesop-fables/containr';
import { DataCache, IDataCache } from './DataCache';
import { IRepository } from './Repository';
import { ScriniumServices } from './ScriniumServices';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';

export interface IAppStorageState {
  dataCaches: IDataCache[];
  repositories: IRepository<any>[];
}

export interface IAppStorage {
  clearAll(): void;
  clearDataCaches(): void;
  clearRepositories(): void;

  repository<Policy>(key: string): IRepository<Policy>;
  retrieve<Policy>(key: string): DataCache<Policy>;
  state$: Observable<IAppStorageState>;
  store<Policy>(key: string, value: DataCache<Policy> | IRepository<Policy>): void;
  storeRepository<Registry>(key: string, value: IRepository<Registry>): void;
}

export class AppStorage implements IAppStorage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly values = new BehaviorSubject<Record<string, any>>({});
  private readonly repositories = new BehaviorSubject<Record<string, IRepository<any>>>({});

  repository<Policy>(key: string): IRepository<Policy> {
    return this.repositories.value[key] as IRepository<Policy>;
  }

  retrieve<Policy>(key: string): DataCache<Policy> {
    return this.values.value[key] as DataCache<Policy>;
  }

  store<Policy>(key: string, value: DataCache<Policy> | IRepository<Policy>): void {
    if (typeof (value as IRepository<Policy>).get === 'function') {
      console.warn(
        `Warning: registering a repository through the store() function is deprecated and will be removed soon. Please use storeRepository instead.`,
      );

      this.repositories.next({
        ...this.repositories.value,
        [key]: value as IRepository<Policy>,
      });
    }

    this.values.next({
      ...this.values.value,
      [key]: value,
    });
  }

  storeRepository<Registry>(key: string, value: IRepository<Registry>): void {
    this.repositories.next({
      ...this.repositories.value,
      [key]: value,
    });
  }

  get state$(): Observable<IAppStorageState> {
    return combineLatest([this.repositories, this.values]).pipe(
      map(([repositories, values]) => {
        const repositoryKeys = Object.keys(repositories);
        return {
          dataCaches: Object.entries(values)
            .filter(([x]) => repositoryKeys.indexOf(x) === -1)
            .map(([, val]) => val),
          repositories: Object.values(repositories),
        };
      }),
    );
  }

  clearAll(): void {

  }

  clearDataCaches(): void {

  }

  clearRepositories(): void {
    Object.values(this.repositories.value).forEach((repo) => repo.reset());
  }
}

export class FromAppStorageInterceptor implements IInterceptor<any> {
  constructor(private readonly key: string) {}

  resolve(currentValue: any | undefined): any {
    const appStorage = currentValue as IAppStorage;
    const cache = appStorage.retrieve<any>(this.key);
    if (typeof cache === 'undefined') {
      console.error(`@fromAppStorage("${this.key}") returned undefined.`);
    }

    return cache;
  }
}

export function fromAppStorage(storageKey: string) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (constructor: Object, propertyKey: string | symbol | undefined, parameterIndex: number): void => {
    registerDependency(constructor, ScriniumServices.AppStorage, parameterIndex);
    const chain = interceptorChainFor(constructor, parameterIndex);
    chain.add(new FromAppStorageInterceptor(storageKey));
  };
}
