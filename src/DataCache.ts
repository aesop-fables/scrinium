import { BehaviorSubject, combineLatest, firstValueFrom, Observable, of } from 'rxjs';
import { delay, distinctUntilChanged, map, switchMap } from 'rxjs/operators';

// eslint-disable-next-line no-shadow
export enum DataCategory {
  Critical,
  NonCritical,
}

export type CompartmentResolver<T> = () => Promise<T>;

export interface DataCompartmentOptions<T> {
  autoLoad?: boolean;
  timeout?: number;
  autoRefresh?: boolean;
  load: CompartmentResolver<T>;
  defaultValue: T;
  dependsOn?: Observable<boolean>;
  unsubscribe?: boolean;
  category: DataCategory;
  onReset?: () => Promise<void>;
}

export interface IDataCompartment {
  name: () => string;
  initialized$: () => Observable<boolean>;
  setData: (value: never) => void;
  getData: () => unknown;
  reload: () => Promise<void>;
  reset: () => Promise<void>;
  category: DataCategory;
}

export class DataCompartment<Model, Options extends DataCompartmentOptions<Model>> implements IDataCompartment {
  private readonly initialized = new BehaviorSubject<boolean>(false);
  private readonly value: BehaviorSubject<Model>;
  private readonly options: Options;

  constructor(private key: string, options: Options) {
    this.options = {
      autoLoad: true,
      unsubscribe: true,
      ...options,
    };

    this.value = new BehaviorSubject<Model>(options.defaultValue);
    console.log(`Configuring ${key}. Autoload: ${this.options.autoLoad}`);
    if (!this.options.autoLoad) {
      return;
    }

    if (!this.options.dependsOn) {
      this.initialize();
      return;
    }

    const subscription = this.options.dependsOn.subscribe({
      next: (val: boolean) => {
        if (!val) {
          return;
        }

        console.log(`DataCache: ${key} dependencies resolved. Initializing...`);
        this.initialize();
        if (this.options.unsubscribe) {
          subscription?.unsubscribe();
        }
      },
      error: (err) => this.initialized.error(err),
    });
  }

  private async initialize(): Promise<void> {
    try {
      const value = await this.options.load();
      this.setValue(value);
      this.initialized.next(true);
    } catch (e) {
      console.log(`Compartment failed to load: ${this.key}`, e);
      this.initialized.error(e);
    }
  }

  name(): string {
    return this.key;
  }

  initialized$(): Observable<boolean> {
    return this.initialized.pipe(delay(1));
  }

  setValue(value: Model): void {
    this.value.next(value);
  }

  // TODO -- Optionally do the throwIfInitError trick based on the DataCategory
  getValue$(): Observable<Model> {
    return this.value.pipe();
  }

  setData(value: never): void {
    this.setValue(value as Model);
  }

  getData(): unknown {
    return this.value.value;
  }

  async reload(): Promise<void> {
    this.initialized.next(false);
    await this.initialize();
  }

  async reset(): Promise<void> {
    this.initialized.next(false);
    this.value.next(this.options.defaultValue);

    if (this.options.onReset) {
      await this.options.onReset();
    }
  }

  get category(): DataCategory {
    return this.options.category;
  }
}

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
