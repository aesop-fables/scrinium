/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventEmitter } from 'events';
import { BehaviorSubject, delay, Observable } from 'rxjs';
import { ILogger } from './Logging';

export declare type EventListener = (listener: () => void) => void;

export interface RefreshOptions {
  /**
   * Delay in milliseconds between each reload of the data source.
   */
  reloadInterval: number;
}

export interface TimeoutOptions {
  /**
   * Period in milliseconds until the data is considered stale and must be reloaded.
   */
  timeout: number;
}

/**
 * Represents a data source used to fill a compartment.
 */
export interface IDataCompartmentSource<T> {
  /**
   * An idempotent function used to load the data for a compartment.
   */
  load(): Promise<T>;
}
/**
 * Adapts a function to the IDataCompartmentSource<T> interface.
 */
export class ConfiguredDataSource<T> implements IDataCompartmentSource<T> {
  /**
   * Constructs a new configured data source.
   * @param provider The function to invoke to resolve the data for the compartment.
   */
  constructor(private readonly provider: () => Promise<T>) {}
  /**
   * Loads the data for a compartment from the provider.
   */
  load(): Promise<T> {
    return this.provider();
  }
}

/**
 * Provides strongly-typed configuration options for an individual data compartment.
 */
export interface DataCompartmentOptions<T> {
  /**
   * Whether to automatically resolve the source.
   * @default true
   */
  autoLoad?: boolean;
  /**
   * The default value to seed the cache.
   */
  defaultValue: T;
  /**
   * Observed conditions (predicate) that must resolve as true in order for a data compartment to load.
   * @example isAuthenticated$
   */
  dependsOn?: Observable<boolean>;
  /**
   * Optional configuration for controlling how frequently the data is reloaded.
   */
  retention?: RefreshOptions | TimeoutOptions;
  /**
   * The data source used to fill a compartment.
   */
  source: IDataCompartmentSource<T>;
}

export interface IDataCompartment {
  // setData: (value: never) => void;
  // getData: () => unknown;

  /**
   * The unique identifier of the compartment.
   */
  key: string;
  /**
   * Provides an observable that emits true when initialization is complete.
   * @returns An observable that emits true when initialization is complete.
   */
  initialized$: () => Observable<boolean>;
  /**
   * Registers the specified listener for the reload event.
   * @param listener The listener to be invoked
   */
  onReload(listener: EventListener): void;
  /**
   * Registers the specified listener for the reset event.
   * @param listener The listener to be invoked
   */
  onReset(listener: EventListener): void;
  /**
   * Reloads the compartment.
   * Note: This triggers the `reload` event.
   */
  reload: () => Promise<void>;
  /**
   * Resets the compartment to the default value.
   * If a retention policy was configured, this will also bust the token.
   */
  reset: () => Promise<void>;
}

/**
 * The event types emitted by data compartments
 */
export enum DataCompartmentEvents {
  /**
   * Occurs when a compartment has successfully reloaded.
   */
  Reload = 'reload',
  /**
   * Occurs when a compartment has been reset.
   */
  Reset = 'reset',
}

/**
 * Represents an individual compartment of data that exposes lifecycle and observable functions to interact
 * with the cached value(s).
 */
export class DataCompartment<Model> implements IDataCompartment {
  private readonly initialized = new BehaviorSubject<boolean>(false);
  private readonly value: BehaviorSubject<Model>;
  private readonly events: EventEmitter;
  /**
   * The options used to configure the compartment.
   */
  readonly options: DataCompartmentOptions<Model>;
  /**
   * The unique identifier of the compartment.
   */
  readonly key: string;

  /**
   * Constructs a new instance of DataCompartment.
   * @param key The identifier of the compartment.
   * @param options The options used to configured the behavior of the compartment.
   * @param logger A configured logger instance.
   * @returns A new instance of DataCompartment.
   */
  constructor(key: string, options: DataCompartmentOptions<Model>, private readonly logger: ILogger) {
    this.key = key;
    this.events = new EventEmitter();
    this.options = {
      autoLoad: true,
      ...options,
    };

    this.value = new BehaviorSubject<Model>(options.defaultValue);
    this.logger.debug(`DataCompartment(${key}): Configuring ${key}. Autoload: ${this.options.autoLoad}`);
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

        this.logger.debug(`DataCompartment(${key}): dependencies resolved. Initializing...`);
        this.initialize().then(() => subscription?.unsubscribe());
      },
      error: (err) => this.initialized.error(err),
    });
  }
  /**
   * Initializes the compartment.
   */
  private async initialize(): Promise<void> {
    try {
      const value = await this.options.source.load();
      this.next(value);
      this.initialized.next(true);
    } catch (e) {
      this.logger.error(`DataCompartment(${this.key}): Compartment failed to load`, e);
      this.initialized.error(e);
    }
  }
  /**
   * Provides an observable that emits true when initialization is complete.
   * @returns An observable that emits true when initialization is complete.
   */
  initialized$(): Observable<boolean> {
    return this.initialized.pipe(delay(1));
  }
  /**
   * Provides an observable that emits the value resolved from the configured source.
   * This will also emit when the value is modified via mutations, resetting, and reloading the compartment.
   */
  get value$(): Observable<Model> {
    return this.value.pipe();
  }
  /**
   * Forcibly replaces the cached value and emits the specified value.
   * @param value The value to store and emit.
   */
  next(value: Model): void {
    this.value.next(value);
  }

  setData(value: never): void {
    this.next(value as Model);
  }

  getData(): unknown {
    return this.value.value;
  }
  /**
   * Registers the specified listener for the reload event.
   * @param listener The listener to be invoked
   */
  onReload(listener: EventListener): void {
    this.events.addListener(DataCompartmentEvents.Reload, listener);
  }
  /**
   * Registers the specified listener for the reset event.
   * @param listener The listener to be invoked
   */
  onReset(listener: EventListener): void {
    this.events.addListener(DataCompartmentEvents.Reset, listener);
  }
  /**
   * Reloads the compartment.
   * Note: This triggers the `reload` event.
   */
  async reload(): Promise<void> {
    this.initialized.next(false);
    await this.initialize();

    this.events.emit(DataCompartmentEvents.Reload);
  }
  /**
   * Resets the compartment to the default value.
   * If a retention policy was configured, this will also bust the token.
   */
  async reset(): Promise<void> {
    this.initialized.next(false);
    this.value.next(this.options.defaultValue);

    this.events.emit(DataCompartmentEvents.Reset);
  }
}
