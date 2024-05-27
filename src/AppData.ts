import { BehaviorSubject, concatMap, firstValueFrom, map, Observable } from 'rxjs';
import { IDataCompartment } from './Compartments';
import { IDataCache, DataCache, createDataCache } from './DataCache';
import { IDataCacheObserver } from './IDataCacheObserver';

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
