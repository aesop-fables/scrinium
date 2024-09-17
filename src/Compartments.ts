/* eslint-disable @typescript-eslint/no-explicit-any */
import { BehaviorSubject, combineLatest, map, Observable, Subscription } from 'rxjs';
import { Predicate } from './Predicate';
import { Latch } from './Utils';
import { DataCompartmentState } from './DataCompartmentState';
import { IEventEnvelopeDestination } from './events/IEventEnvelopeDestination';
import { IEventPublisher } from './events/IEventPublisher';
import { ConfiguredEventPublisher } from './events/ConfiguredEventPublisher';
import { EnvelopeProducer } from './events/IEventEnvelopeProducer';
import {
  CompartmentDataSourceLoadFailed,
  CompartmentDataSourceLoadRequested,
  CompartmentInitializationRequested,
  CompartmentInitialized,
  CompartmentLazyLoadTriggered,
  CompartmentLoadIgnored,
  CompartmentModified,
  CompartmentPredicateResolved,
  CompartmentReloadRequested,
  CompartmentReset,
  CompartmentSubscriptionDestroyed,
} from './CompartmentEvents';

export declare type EventListener = (listener: () => void) => void;

export declare type CompartmentComparer<T> = (a: T, b: T) => boolean;

export function defaultComparer<T>(a: T, b: T): boolean {
  return a === b;
}

export declare type LoadingStrategy = 'auto' | 'lazy' | 'manual';

export declare type LoadingOptions = {
  strategy: LoadingStrategy;
  predicate?: Predicate;
};

export declare type EventOptions = {
  enabled?: boolean;
  streamId?: string;
  destinations?: IEventEnvelopeDestination[];
};

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
   * Provides fine-grained control over how/when the compartment loads.
   * If no options are specified, the compartment will auto load.
   */
  loadingOptions?: LoadingOptions;
  /**
   * The default value to seed the cache.
   */
  defaultValue: T;
  /**
   * Optional configuration for controlling how the data is retained.
   * Coming in 1.0.
   */
  retention?: RefreshOptions | TimeoutOptions;
  /**
   * The data source used to fill a compartment.
   */
  source: IDataCompartmentSource<T>;
  /**
   * The comparer to use to determine whether to publish the next value.
   * Publishes if the value is false.
   * @default defaultComparer
   */
  comparer?: CompartmentComparer<T>;

  /**
   * Configures the event sourcing options.
   */
  events?: EventOptions;
  /**
   * Optional callback when an error occurs while loading the compartment.
   * @param error The error thrown by the source.
   */
  onError?: (error: Error) => void;
}

export interface IDataCompartment {
  /**
   * The unique identifier of the compartment.
   */
  key: string;
  /**
   * Provides an observable that emits true when initialization is complete.
   * @returns An observable that emits true when initialization is complete.
   */
  initialized$: Observable<boolean>;
  /**
   * Provides an observable that emits true when the compartment is loading.
   * @returns An observable that emits true when initialization is complete.
   */
  loading$: Observable<boolean>;
  /**
   * The options used to configure the compartment.
   */
  options: DataCompartmentOptions<any>;
  /**
   * Gets a snapshot of the current state of the compartment. If the compartment is configured as lazy loading, this will not trigger any loading.
   * @returns DataCompartmentState
   */
  getCompartmentState(): DataCompartmentState;
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
 * Represents an individual compartment of data that exposes lifecycle and observable functions to interact
 * with the cached value(s).
 */
export class DataCompartment<Model> implements IDataCompartment {
  private readonly initialized = new BehaviorSubject<boolean>(false);
  private readonly loading = new BehaviorSubject<boolean>(false);
  private readonly latch = new Latch();
  private readonly value: BehaviorSubject<Model>;
  private readonly eventPublisher: IEventPublisher;
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
   * @returns A new instance of DataCompartment.
   */
  constructor(key: string, options: DataCompartmentOptions<Model>) {
    this.key = key;
    this.options = {
      comparer: defaultComparer,
      loadingOptions: {
        strategy: 'auto',
        ...(options.loadingOptions ?? {}),
      },
      ...options,
    };

    const destinations: IEventEnvelopeDestination[] = [];
    let streamId = new Date().toISOString();
    if (this.options.events?.enabled) {
      streamId = this.options.events.streamId ?? streamId;
      destinations.push(...(this.options.events.destinations ?? []));
    }

    this.eventPublisher = new ConfiguredEventPublisher(streamId, new EnvelopeProducer(), destinations);

    this.value = new BehaviorSubject<Model>(options.defaultValue);
    if (this.options.loadingOptions?.strategy !== 'auto') {
      return;
    }

    this.initialize();
  }
  /**
   * Initializes the compartment.
   */
  private async initialize(): Promise<void> {
    const eventPublisher = this.eventPublisher;
    const compartmentId = this.key;
    if (this.options.loadingOptions?.predicate) {
      const predicate$ = this.options.loadingOptions.predicate;
      const initializeCompartment = async () => {
        if (!this.initialized.value) {
          eventPublisher.publish(
            CompartmentInitializationRequested.Type,
            new CompartmentInitializationRequested(compartmentId),
          );
          await this.load();
        }
      };
      // eslint-disable-next-line prefer-const
      let subscription: Subscription | undefined;
      const unsubscribe = () => {
        if (subscription) {
          this.eventPublisher.publish(
            CompartmentSubscriptionDestroyed.Type,
            new CompartmentSubscriptionDestroyed(this.key),
          );
          subscription.unsubscribe();
        }
      };

      subscription = predicate$.createObservable().subscribe({
        next(value) {
          if (value) {
            eventPublisher.publish(CompartmentPredicateResolved.Type, new CompartmentPredicateResolved(compartmentId));
            initializeCompartment();
          }

          try {
            unsubscribe();
          } catch {}
        },
      });
    } else {
      await this.load();
    }
  }

  private async load(force = false): Promise<void> {
    const isInitialized = () => this.initialized.value;
    await this.latch.execute(async () => {
      if (isInitialized() && !force) {
        this.eventPublisher.publish(CompartmentLoadIgnored.Type, new CompartmentLoadIgnored(this.key, force));
        return;
      }

      this.loading.next(true);
      try {
        this.eventPublisher.publish(
          CompartmentDataSourceLoadRequested.Type,
          new CompartmentDataSourceLoadRequested(this.key),
        );
        const value = await this.options.source.load();
        this.next(value);
        this.initialized.next(true);
        this.eventPublisher.publish(CompartmentInitialized.Type, new CompartmentInitialized(this.key));
      } catch (e) {
        if (this.options.onError) {
          this.options.onError(e as Error);
        } else {
          console.log(`%c scrinium: Error loading compartment '${this.key}'`, 'background: #250201; color: #E27E7B;');
          console.error(e);
        }
        this.initialized.error(e);

        this.eventPublisher.publish(
          CompartmentDataSourceLoadFailed.Type,
          new CompartmentDataSourceLoadFailed(this.key),
        );
      } finally {
        this.loading.next(false);
      }
    });
  }
  /**
   * Provides an observable that emits true when initialization is complete.
   * @returns An observable that emits true when initialization is complete.
   */
  get initialized$(): Observable<boolean> {
    return this.initialized.pipe(
      map((initialized) => {
        if (!initialized && !this.latch.isLatched && this.options.loadingOptions?.strategy === 'lazy') {
          this.eventPublisher.publish(CompartmentLazyLoadTriggered.Type, new CompartmentLazyLoadTriggered(this.key));
          this.initialize();
        }

        return initialized;
      }),
    );
  }
  /**
   * Provides an observable that emits true when the compartment is loading.
   * @returns An observable that emits true when initialization is complete.
   */
  get loading$(): Observable<boolean> {
    return this.loading.pipe();
  }
  /**
   * Provides an observable that emits the value resolved from the configured source.
   * This will also emit when the value is modified via mutations, resetting, and reloading the compartment.
   */
  get value$(): Observable<Model> {
    return combineLatest([this.initialized$, this.value]).pipe(map(([, value]) => value));
  }
  /**
   * Attempts to update the cached value (if the comparer detects an update).
   * @param value The value to store and emit.
   */
  next(value: Model): void {
    let shouldPublish = true;
    if (this.options.comparer) {
      shouldPublish = !this.options.comparer(this.value.value, value);
    }

    if (shouldPublish) {
      this.value.next(value);
      this.eventPublisher.publish(CompartmentModified.Type, new CompartmentModified(this.key));
    }
  }
  setData(value: never): void {
    this.next(value as Model);
  }

  getData(): unknown {
    return this.value.value;
  }

  getCompartmentState(): DataCompartmentState {
    let error: any;
    let initialized = false;
    try {
      initialized = this.initialized.value;
    } catch (e) {
      error = e;
    }

    return {
      initialized,
      loading: this.loading.value,
      error,
      key: this.key,
      options: this.options,
      value: this.value.value,
    };
  }
  /**
   * Reloads the compartment.
   * Note: This triggers the `reload` event.
   */
  async reload(): Promise<void> {
    this.eventPublisher.publish(CompartmentReloadRequested.Type, new CompartmentReloadRequested(this.key));
    await this.load(true);
  }
  /**
   * Resets the compartment to the default value.
   * If a retention policy was configured, this will also bust the token.
   */
  async reset(): Promise<void> {
    this.initialized.next(false);
    this.value.next(this.options.defaultValue);
    this.eventPublisher.publish(CompartmentReset.Type, new CompartmentReset(this.key));
  }
}
