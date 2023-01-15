/* eslint-disable @typescript-eslint/no-explicit-any */
import { combineLatest, firstValueFrom, Observable, of } from 'rxjs';
import { distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { DataCompartment, DataCompartmentOptions, IDataCompartment, DataCompartmentEvents } from './Compartments';
import { consoleLogger, ILogger } from './Logging';

export interface IDataCacheObserver {
  observe(compartments: IDataCompartment[]): void;
}

export interface IDataCache {
  observeWith: (observer: IDataCacheObserver) => void;
}

export class DataCache<T> implements IDataCache {
  constructor(private compartments: IDataCompartment[]) {}

  observe$<Output>(key: keyof T): Observable<Output> {
    return of(this.compartments).pipe(
      switchMap((compartments) => {
        const compartment = compartments.find((x) => x.key === String(key));
        if (!compartment) {
          throw new Error(`Could not find compartment: ${String(key)}`);
        }

        return (compartment as DataCompartment<Output, DataCompartmentOptions<Output>>).value$;
      }),
      distinctUntilChanged(),
    );
  }

  initialized$(): Observable<boolean> {
    return of(this.compartments).pipe(
      switchMap((compartments) => {
        return combineLatest(compartments.map((x) => x.initialized$())).pipe(
          map((values) => values.every((x) => x === true)),
        );
      }),
    );
  }

  watch(key: keyof T, event: DataCompartmentEvents, listener: () => void): void {
    const compartment = this.findCompartment(key) as DataCompartment<any, DataCompartmentOptions<any>>;
    if (event === DataCompartmentEvents.Reload) {
      compartment.onReload(listener);
      return;
    }

    if (event === DataCompartmentEvents.Reset) {
      compartment.onReset(listener);
      return;
    }
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

    const stronglyTypedCompartment = compartment as DataCompartment<Model, DataCompartmentOptions<Model>>;
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
  policy: Compartments,
  logger: ILogger = consoleLogger,
): DataCache<Compartments> {
  const entries = Object.entries(policy);
  const compartments: IDataCompartment[] = entries.map(([key, value]) => {
    return new DataCompartment<unknown, DataCompartmentOptions<unknown>>(
      key,
      value as DataCompartmentOptions<unknown>,
      logger,
    );
  });

  return new DataCache<Compartments>(compartments);
}
