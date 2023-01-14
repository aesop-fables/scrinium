import { combineLatest, firstValueFrom, Observable, of } from 'rxjs';
import { distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { DataCategory, DataCompartment, DataCompartmentOptions, IDataCompartment } from './Compartments';

export interface IDataCacheObserver {
  observe(compartments: IDataCompartment[]): void;
}

export interface IDataCache {
  observeWith: (observer: IDataCacheObserver) => void;
}

export class DataCache<T> implements IDataCache {
  constructor(private compartments: IDataCompartment[]) {}

  observe$<Output>(name: keyof T): Observable<Output> {
    return of(this.compartments).pipe(
      switchMap((compartments) => {
        const compartment = compartments.find((x) => x.name() === String(name));
        if (!compartment) {
          throw new Error(`Could not find compartment: ${String(name)}`);
        }

        return (compartment as DataCompartment<Output, DataCompartmentOptions<Output>>).getValue$();
      }),
      distinctUntilChanged(),
    );
  }

  initialized$(): Observable<boolean> {
    return of(this.compartments).pipe(
      switchMap((compartments) => {
        const criticalCompartments = compartments.filter((x) => x.category === DataCategory.Critical);
        return combineLatest(criticalCompartments.map((x) => x.initialized$())).pipe(
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

  async reload(name: keyof T): Promise<void> {
    const compartment = this.compartments.find((x) => x.name() === String(name));
    if (!compartment) {
      throw new Error(`Could not find compartment: ${String(name)}`);
    }

    return compartment.reload();
  }

  async resetAll(): Promise<void> {
    for (let i = 0; i < this.compartments.length; i++) {
      await this.compartments[i].reset();
    }
  }

  async reset(name: keyof T): Promise<void> {
    const compartment = this.compartments.find((x) => x.name() === String(name));
    if (!compartment) {
      throw new Error(`Could not find compartment: ${String(name)}`);
    }

    return compartment.reset();
  }

  findCompartment(name: keyof T): IDataCompartment {
    const compartment = this.compartments.find((x) => x.name() === String(name));
    if (!compartment) {
      throw new Error(`Could not find compartment: ${String(name)}`);
    }

    return compartment;
  }

  observeWith(observer: IDataCacheObserver): void {
    observer.observe(this.compartments);
  }

  async modifyCompartment(name: keyof T, modifier: (compartment: IDataCompartment) => Promise<void>): Promise<void> {
    const compartment = this.compartments.find((x) => x.name() === String(name));
    if (!compartment) {
      throw new Error(`Could not find compartment: ${String(name)}`);
    }

    await modifier(compartment);
  }

  async modify<Model>(name: keyof T, modifier: (currentValue: Model) => Promise<Model>): Promise<void> {
    const compartment = this.compartments.find((x) => x.name() === String(name));
    if (!compartment) {
      throw new Error(`Could not find compartment: ${String(name)}`);
    }

    const stronglyTypedCompartment = compartment as DataCompartment<Model, DataCompartmentOptions<Model>>;
    const currentValue = await firstValueFrom(stronglyTypedCompartment.getValue$());
    const newValue = await modifier(currentValue);

    stronglyTypedCompartment.setValue(newValue);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createDataCache<Compartments extends Record<string, any>>(
  policy: Compartments,
): DataCache<Compartments> {
  const entries = Object.entries(policy);
  const compartments: IDataCompartment[] = entries.map(([key, value]) => {
    return new DataCompartment<unknown, DataCompartmentOptions<unknown>>(key, value as DataCompartmentOptions<unknown>);
  });

  return new DataCache<Compartments>(compartments);
}
