/* eslint-disable @typescript-eslint/no-explicit-any */
import { Observable } from 'rxjs';
import { Predicate } from './Predicate';
import { DataCompartmentState } from './DataCompartmentState';
import { ISystemClock, SystemOverrides } from './System';
import { IDataCompartmentSource } from './IDataCompartmentSource';

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

export interface RetentionOptions {
  policies: IRetentionPolicy[];
}

export interface IRetentionPolicy {
  isExpired(clock: ISystemClock, compartment: IDataCompartment): boolean;
}

export function cacheForSeconds(seconds: number): IRetentionPolicy {
  return {
    isExpired: (clock: ISystemClock, compartment: IDataCompartment) => {
      return clock.now() - compartment.getCompartmentState().lastLoaded > seconds * 1000;
    },
  };
}

type ActionWithArgs<T> = (value: T) => void;

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
   */
  retention?: RetentionOptions;
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
   * Optional callback when a compartment has finished loading.
   * @param value The data loaded from the source.
   */
  onLoad?: ActionWithArgs<T>;
  /**
   * Optional callback when an error occurs while loading the compartment.
   * @param error The error thrown by the source.
   */
  onError?: ActionWithArgs<Error>;

  /**
   * Optional system overrides (mostly used for testing but could prove useful otherwise)
   */
  system?: SystemOverrides;
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
   * Provides an observable that emits a timestamp when the compartment was last loaded.
   */
  lastLoaded$: Observable<number>;
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
