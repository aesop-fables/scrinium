/* eslint-disable @typescript-eslint/no-explicit-any */
import { BehaviorSubject, concatMap, distinctUntilChanged, firstValueFrom, map, mergeMap, Observable, of, switchMap } from 'rxjs';
import { DataCompartmentOptions, IDataCompartment } from './Compartments';
import { IDataCache, DataCache, createDataCache } from './DataCache';
import { IDataCacheObserver } from './IDataCacheObserver';
import { DataCacheHash } from './DataCacheHash';
import { ISubject } from './ISubject';
import { IAppStorage } from './AppStorage';

// TODO:
// 1. Make a value type to represent the hash (maybe we flip the hash generation to be in the value type)
// 2. AppData should let you query by dataCache

// Shouldn't we just be building up an internal application state anyway? 🤔

// configure((options) => options.scan([hash1, hash2]));

// function blah() {
//   something.createAppStorageQuery({
//     scan: [hash1, hash2],
//     keys: [],
//   });
// }

export interface AppDataCompartmentState {
  key: string;
  initialized: boolean;
  hasError: boolean;
}

export interface AppDataState {
  compartments: AppDataCompartmentState[];
}

export class AppData implements IDataCacheObserver {
  private readonly compartments = new BehaviorSubject<IDataCompartment[]>([]);

  hasError$(): Observable<boolean> {
    return this.state$().pipe(map((state) => state.compartments.some((x) => x.hasError === true)));
  }

  state$(): Observable<AppDataState> {
    return this.compartments.pipe(
      concatMap(async (compartments) => {
        const mappedCompartments: AppDataCompartmentState[] = [];
        for (let i = 0; i < compartments.length; i++) {
          const compartment = compartments[i];
          let hasError = false;
          let initialized = false;

          try {
            initialized = await firstValueFrom(compartment.initialized$());
          } catch (e) {
            hasError = true;
          }

          mappedCompartments.push({
            key: compartment.key,
            initialized,
            hasError,
          });
        }

        return {
          compartments: mappedCompartments,
        };
      }),
    );
  }

  observe(compartments: IDataCompartment[]): void {
    this.compartments.next([...this.compartments.value, ...compartments]);
  }
}

const appData = new AppData();
export function registerDataCache(cache: IDataCache): void {
  cache.observeWith(appData);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createObservedDataCache<Compartments extends Record<string, any>>(
  policy: Compartments,
): DataCache<Compartments> {
  const cache = createDataCache<Compartments>(policy);
  registerDataCache(cache);

  return cache;
}

export default appData;

// Pretend like we have a new file and let's free write?

// This represents the state but will likely act as a query dispatcher
// export interface IApplicationState {
//   executeQuery(): Promise<void>;
// }

export interface DataCompartmentState {
  key: string;
  options: DataCompartmentOptions<any>;
  hash: string;
  initialized: boolean;
  hasError: boolean;
}

export interface IApplicationState {
  compartments: DataCompartmentState[];
}

// TODO: Convert appStorage.state to IApplicationState
// How? Easy...first, we ignore repositories. Then:
// 1. Create a dataCache observer
// 2. use that against all of the caches in appStorage.state
// 3. That state is then available to anyone (we just have to make sure we capture errors correctly) - should just be able to adapt the AppData class for 1/2
// 4. We can write something in DM for now to handle querying against the IApplicationState

export class ApplicationState implements ISubject<IApplicationState> {
  constructor(private readonly appStorage: IAppStorage) {}

  createObservable(): Observable<IApplicationState> {
    return this.appStorage.state$.pipe(
      mergeMap(async (state) => {
        const mappedCompartments: DataCompartmentState[] = [];
        for (let i = 0; i < state.dataCaches.length; i++) {
          const cache = state.dataCaches[i];
          const hash = DataCacheHash.from(cache);
          const compartments: IDataCompartment[] = [];
          cache.observeWith({
            observe(c) {
              compartments.push(...c);
            },
          });

          for (let j = 0; j < compartments.length; j++) {
            const compartment = compartments[j];
            let hasError = false;
            let initialized = false;

            try {
              initialized = await firstValueFrom(compartment.initialized$());
            } catch (e) {
              hasError = true;
            }

            mappedCompartments.push({
              key: compartment.key,
              hasError,
              hash,
              initialized,
              options: compartment.options,
            });
          }
        }

        return {
          compartments: mappedCompartments,
        };
      }),
    );
  }
}
