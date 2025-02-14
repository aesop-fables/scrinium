/* eslint-disable @typescript-eslint/no-explicit-any */
import { BehaviorSubject, combineLatest, filter, map, Observable, pairwise, Subscription } from 'rxjs';
import { Latch } from './Utils';
import { ChangeRecord, DataCompartmentState, IRetentionPolicy } from './Compartments';
import { ISystemClock, systemClock } from './System';
import {
  ApplicationCacheManagerRetentionPolicy,
  DataCompartmentOptions,
  defaultComparer,
  IDataCompartment,
  RetentionContext,
} from './Compartments';
import { ApplicationCacheManager, IApplicationCacheManager } from './Caching';
import { DataStoreToken } from './DataStoreToken';
/**
 * Represents an individual compartment of data that exposes lifecycle and observable functions to interact
 * with the cached value(s).
 */
export class DataCompartment<Model> implements IDataCompartment {
  private readonly initialized = new BehaviorSubject<boolean>(false);
  private readonly loading = new BehaviorSubject<boolean>(false);
  private readonly lastLoaded = new BehaviorSubject<number>(0);
  private readonly latch = new Latch();
  private readonly value: BehaviorSubject<Model>;
  private readonly systemClock: ISystemClock;
  private readonly appCache: IApplicationCacheManager;
  private readonly policies: IRetentionPolicy[];
  /**
   * The options used to configure the compartment.
   */
  readonly options: DataCompartmentOptions<Model>;
  /**
   * The unique identifier of the compartment.
   */
  readonly token: DataStoreToken;

  /**
   * Constructs a new instance of DataCompartment.
   * @param key The identifier of the compartment.
   * @param options The options used to configured the behavior of the compartment.
   * @returns A new instance of DataCompartment.
   */
  constructor(token: DataStoreToken, options: DataCompartmentOptions<Model>) {
    this.token = token;
    this.options = {
      comparer: defaultComparer,
      loadingOptions: {
        strategy: 'auto',
        ...(options.loadingOptions ?? {}),
      },
      ...options,
    };

    this.systemClock = this.options.system?.clock ?? systemClock;
    this.appCache = this.options.system?.cache ?? ApplicationCacheManager.instance;
    this.policies = [new ApplicationCacheManagerRetentionPolicy(), ...(this.options.retention?.policies ?? [])];

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
    if (this.options.loadingOptions?.predicate) {
      const predicate$ = this.options.loadingOptions.predicate;
      const initializeCompartment = async () => {
        if (!this.initialized.value || this.isExpired) {
          await this.load(this.isExpired);
        }
      };
      // eslint-disable-next-line prefer-const
      let subscription: Subscription | undefined;
      const unsubscribe = () => {
        if (subscription) {
          subscription.unsubscribe();
        }
      };

      subscription = predicate$.createObservable().subscribe({
        next(value) {
          if (value) {
            initializeCompartment();
          }

          try {
            unsubscribe();
          } catch {}
        },
      });
    } else {
      await this.load(this.isExpired);
    }
  }

  private async load(force = false): Promise<void> {
    const isInitialized = () => this.initialized.value;
    await this.latch.execute(async () => {
      if (isInitialized() && !force) {
        return;
      }

      this.loading.next(true);
      try {
        const value = await this.options.source.load();
        this.next(value);
        this.initialized.next(true);
        this.lastLoaded.next(this.systemClock.now());

        const policies = this.policies;
        for (let i = 0; i < policies.length; i++) {
          const policy = policies[i];
          policy.markForExpiration(this, new RetentionContext(this.appCache, this.systemClock));
        }

        if (this.options.onLoad) {
          this.options.onLoad(value);
        }
      } catch (e) {
        if (this.options.onError) {
          this.options.onError(e as Error);
        } else {
          console.log(`%c scrinium: Error loading compartment '${this.key}'`, 'background: #250201; color: #E27E7B;');
          console.error(e);
        }
        this.initialized.error(e);
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
    return combineLatest([this.initialized, this.lastLoaded]).pipe(
      map(([initialized]) => {
        const shouldInitialize = !initialized || this.isExpired;
        if (shouldInitialize && !this.latch.isLatched && this.options.loadingOptions?.strategy === 'lazy') {
          this.initialize();
        }

        return initialized;
      }),
    );
  }
  /**
   * Provides an observable that emits true when the compartment is loading.
   * @returns An observable that emits true when the compartment is loading.
   */
  get loading$(): Observable<boolean> {
    return this.loading.pipe();
  }
  /**
   * Provides an observable that emits a timestamp when the compartment was last loaded.
   */
  get lastLoaded$(): Observable<number> {
    return this.lastLoaded.pipe();
  }
  /**
   * Provides an observable that emits the value resolved from the configured source.
   * This will also emit when the value is modified via mutations, resetting the compartment, and reloading the compartment.
   */
  get value$(): Observable<Model> {
    return combineLatest([this.initialized$, this.value]).pipe(map(([, value]) => value));
  }
  /**
   * Attempts to update the cached value (if the comparer detects an update).
   * @param value The value to store and emit.
   */
  next(value: Model): void {
    if (this.shouldPublish(this.value.value, value)) {
      this.value.next(value);
    }
  }
  /**
   * The unique identifier of the compartment.
   */
  get key(): string {
    return this.token.value;
  }

  get isExpired(): boolean {
    const retention = this.options.retention;
    if (!retention) {
      return false;
    }

    const policies = this.policies;
    return policies.some((policy) => policy.isExpired(this, new RetentionContext(this.appCache, this.systemClock)));
  }

  setData(value: never): void {
    this.next(value as Model);
  }

  getData(): unknown {
    return this.value.value;
  }

  shouldPublish(previous: Model, current: Model) {
    let shouldPublish = true;
    if (this.options.comparer) {
      shouldPublish = !this.options.comparer(previous, current);
    }

    return shouldPublish;
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
      lastLoaded: this.lastLoaded.value,
      key: this.key,
      token: this.token,
      options: this.options,
      value: this.value.value,
    };
  }
  /**
   * Reloads the compartment.
   * Note: This triggers the `reload` event.
   */
  async reload(): Promise<void> {
    await this.load(true);
  }
  /**
   * Resets the compartment to the default value.
   * If a retention policy was configured, this will also bust the token.
   */
  async reset(): Promise<void> {
    this.initialized.next(false);
    this.value.next(this.options.defaultValue);
    this.lastLoaded.next(0);
  }

  addEventListener(type: EventType, listener: CompartmentEventListener): Subscription {
    switch (type) {
      case 'change':
        return this.value.pipe(pairwise()).subscribe(([previous, current]) => {
          if (this.shouldPublish(previous, current)) {
            const event: ChangeEvent = { previous, current };
            const envelope = createEventEnvelope('change', event);
            listener(envelope);
          }
        });
      case 'initialized':
        const initialized$ = this.initialized$.pipe(
          pairwise(),
          filter(([prev, curr]) => !prev && curr),
          map(([, curr]) => curr),
        );
        return combineLatest([initialized$, this.value])
          .pipe(filter(([x]) => x === true))
          .subscribe(([, val]) => {
            const event: InitializedEvent = { value: val };
            const envelope = createEventEnvelope('initialized', event);
            listener(envelope);
          });
      case 'reset':
        const reset$ = this.initialized$.pipe(
          pairwise(),
          filter(([prev, curr]) => prev && !curr),
          map(([, curr]) => curr),
        );
        return combineLatest([reset$, this.value])
          .pipe(filter(([x]) => x === false))
          .subscribe(([, val]) => {
            const event: ResetEvent = { value: val };
            const envelope = createEventEnvelope('reset', event);
            listener(envelope);
          });
    }

    throw new Error(`Invalid type ${type}`);
  }
}

export type ChangeEvent = ChangeRecord;
export type InitializedEvent = { value: any };
export type ResetEvent = { value: any };
export type CompartmentEvent = ChangeEvent | InitializedEvent | ResetEvent;
export type EventType = 'change' | 'initialized' | 'reset';

export type EventEnvelope = {
  type: EventType;
  timestamp: number;
  details: CompartmentEvent;
};

export type CompartmentEventListener = (envelope: EventEnvelope) => void;

export function createEventEnvelope(type: EventType, event: CompartmentEvent): EventEnvelope {
  return {
    type,
    timestamp: Date.now(),
    details: event,
  };
}
