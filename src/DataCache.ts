/* eslint-disable @typescript-eslint/no-explicit-any */
import { combineLatest, firstValueFrom, Observable, of } from 'rxjs';
import { distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { DataCompartmentOptions, IDataCompartment } from './Compartments';
import { IDataCacheObserver } from './IDataCacheObserver';
import { ScriniumDiagnostics } from './Diagnostics';
import { DataCompartment } from './DataCompartment';
import { AppStorageToken } from './AppStorageToken';

export interface IDataCache {
  compartments: IDataCompartment[];
  observeWith: (observer: IDataCacheObserver) => void;
  token: AppStorageToken;
}

export class DataCache<T> implements IDataCache {
  constructor(
    readonly token: AppStorageToken,
    readonly compartments: IDataCompartment[],
  ) {}

  observe$<Output>(key: keyof T): Observable<Output> {
    if (ScriniumDiagnostics.shouldObserve(String(key))) {
      ScriniumDiagnostics.captureObserve(String(key));
    }

    return of(this.compartments).pipe(
      switchMap((compartments) => {
        const compartment = compartments.find((x) => x.key === String(key));
        if (!compartment) {
          throw new Error(`Could not find compartment: ${String(key)}`);
        }

        return (compartment as DataCompartment<Output>).value$;
      }),
      distinctUntilChanged(),
    );
  }

  get initialized$(): Observable<boolean> {
    if (ScriniumDiagnostics.options.watchCacheInitialization) {
      ScriniumDiagnostics.captureCacheInitialized();
    }

    return of(this.compartments).pipe(
      switchMap((compartments) => {
        return combineLatest(compartments.map((x) => x.initialized$)).pipe(
          map((values) => values.every((x) => x === true)),
        );
      }),
    );
  }

  async reloadAll(): Promise<void> {
    for (let i = 0; i < this.compartments.length; i++) {
      await this.compartments[i].reload();
    }
  }

  async reload(key: keyof T): Promise<void> {
    const compartment = this.findCompartment(key);
    return compartment.reload();
  }

  async resetAll(): Promise<void> {
    for (let i = 0; i < this.compartments.length; i++) {
      await this.compartments[i].reset();
    }
  }

  async reset(key: keyof T): Promise<void> {
    await this.withCompartment(key, (compartment) => compartment.reset());
  }

  findCompartment(key: keyof T): IDataCompartment {
    const compartment = this.compartments.find((x) => x.key === String(key));
    if (!compartment) {
      throw new Error(`Could not find compartment: ${String(key)}`);
    }

    return compartment;
  }

  observeWith(observer: IDataCacheObserver): void {
    observer.observe(this.compartments);
  }

  async modify<Model>(key: keyof T, modifier: (currentValue: Model) => Promise<Model>): Promise<void> {
    const compartment = this.findCompartment(key);

    const stronglyTypedCompartment = compartment as DataCompartment<Model>;
    const currentValue = await firstValueFrom(stronglyTypedCompartment.value$);
    const newValue = await modifier(currentValue);

    stronglyTypedCompartment.next(newValue);
  }

  withCompartment<Return>(key: keyof T, action: (compartment: IDataCompartment) => Return): Return {
    const compartment = this.findCompartment(key);
    return action(compartment);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createDataCache<Compartments extends Record<string, any>>(
  token: AppStorageToken,
  policy: Compartments,
): DataCache<Compartments> {
  const entries = Object.entries(policy);
  const compartments: IDataCompartment[] = entries.map(([key, value]) => {
    return new DataCompartment<unknown>(key, value as DataCompartmentOptions<unknown>);
  });

  return new DataCache<Compartments>(token, compartments);
}
