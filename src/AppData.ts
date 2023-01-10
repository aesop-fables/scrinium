import { BehaviorSubject, concatMap, firstValueFrom, map, Observable } from 'rxjs';
import {
  DataCategory,
  IDataCacheObserver,
  IDataCompartment,
  IDataCache,
  DataCache,
  createDataCache,
} from './DataCache';

export interface AppDataCompartmentState {
  name: string;
  initialized: boolean;
  hasError: boolean;
  category: DataCategory;
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
            name: compartment.name(),
            initialized,
            hasError,
            category: compartment.category,
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
