/* eslint-disable @typescript-eslint/no-explicit-any */
import { combineLatest, firstValueFrom, Observable, of } from 'rxjs';
import { distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { DataCompartmentOptions, IDataCompartment } from './Compartments';
import { IDataCacheObserver } from './IDataCacheObserver';
import { DataCompartment } from './DataCompartment';
import { DataStoreToken } from './DataStoreToken';
import { ICompartmentStorage } from './ICompartmentStorage';

export interface IDataCache extends ICompartmentStorage {
  compartments: IDataCompartment[];
  observeWith: (observer: IDataCacheObserver) => void;
  token: DataStoreToken;
}

export class DataCache<T> implements IDataCache {
  constructor(
    readonly token: DataStoreToken,
    readonly compartments: IDataCompartment[],
  ) {}

  get managedTokens(): DataStoreToken[] {
    return this.compartments.map((x) => x.token);
  }

  observe$<Output>(key: keyof T): Observable<Output> {
    return of(this.compartments).pipe(
      switchMap((compartments) => {
        const compartmentToken = this.token.compartment(String(key));
        const compartment = compartments.find((x) => x.token.equals(compartmentToken));
        if (!compartment) {
          throw new Error(`Could not find compartment: ${String(key)}`);
        }

        return (compartment as DataCompartment<Output>).value$;
      }),
      distinctUntilChanged(),
    );
  }

  get initialized$(): Observable<boolean> {
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

  findCompartment(key: keyof T | DataStoreToken): IDataCompartment {
    const targetToken = typeof key === 'string' ? this.token.compartment(String(key)) : (key as DataStoreToken);
    const compartment = this.compartments.find((x) => x.token.equals(targetToken));
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
/**
 * @deprecated Use the upcoming `configureDataCache` instead
 */
export function createDataCache<Compartments extends Record<string, any>>(
  token: DataStoreToken,
  policy: Compartments,
): DataCache<Compartments> {
  const entries = Object.entries(policy);
  const compartments: IDataCompartment[] = entries.map(([key, value]) => {
    const compartmentToken = token.compartment(key);
    return new DataCompartment<unknown>(compartmentToken, value as DataCompartmentOptions<unknown>);
  });

  return new DataCache<Compartments>(token, compartments);
}

declare type DataCacheRegistry<Compartments> = {
  [Property in keyof Compartments]: DataCompartmentOptions<Compartments[Property]>;
};

export function configureDataCache<Compartments extends Record<string, any>>(
  token: DataStoreToken,
  registry: DataCacheRegistry<Compartments>,
): DataCache<Compartments> {
  const entries = Object.entries(registry);
  const compartments: IDataCompartment[] = entries.map(([key, value]) => {
    const compartmentToken = token.compartment(key);
    return new DataCompartment<unknown>(compartmentToken, value as DataCompartmentOptions<unknown>);
  });

  return new DataCache<Compartments>(token, compartments);
}
