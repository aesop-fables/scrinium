import { BehaviorSubject, delay, Observable } from 'rxjs';

// eslint-disable-next-line no-shadow
export enum DataCategory {
  Critical,
  NonCritical,
}

export type CompartmentResolver<T, Key> = (key?: Key) => Promise<T>;

export interface DataCompartmentOptions<T, Key = any> {
  autoLoad?: boolean;
  timeout?: number;
  autoRefresh?: boolean;
  // 1. Move load over to DataCacheCompartmentOptions
  load: CompartmentResolver<T, Key>;
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
    // TODO -- Bring back some debug-level logging
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

        // TODO -- Bring back some debug-level logging
        // console.log(`DataCache: ${key} dependencies resolved. Initializing...`);
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
