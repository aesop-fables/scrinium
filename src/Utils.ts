/* eslint-disable @typescript-eslint/no-explicit-any */
import { Subscription, filter } from 'rxjs';
import { DataCache, createDataCache } from './DataCache';
import { Semaphore } from 'async-mutex';
import { DataCompartment } from './DataCompartment';
import { AppStorageToken } from './AppStorageToken';

export interface SubscriptionProxy<Compartments> {
  <T>(name: keyof Compartments): Promise<T>;
}

export interface DataCacheScenario<Compartments> {
  cache: DataCache<Compartments>;
  /**
   * Provides strongly typed access to the value of the underlying compartment.
   */
  createProxy: SubscriptionProxy<Compartments>;
  waitForAllCompartments: () => Promise<void>;
}

/**
 * A helper function for creating a testing scenario.
 * @param policy The policy to configure the cache.
 * @returns Encapsulates the cache and a few helpers for controlling and accessing data for testing purposes.
 * @example
 * const a: ResponseA[] = [];
 * const b: ResponseB[] = [];
 *
 * const { createProxy } = createDataCacheScenario<TestStoreCompartments>({
 *  a: {
 *   source: new ConfiguredDataSource(async () => a),
 *   defaultValue: [],
 *  },
 *  b: {
 *   source: new ConfiguredDataSource(async () => b),
 *   defaultValue: [],
 *  },
 * });
 *
 * const observedA = await createProxy<ResponseA>('a');
 * expect(observedA).toStrictEqual(a);
 *
 * const observedB = await createProxy<ResponseB>('b');
 * expect(observedB).toStrictEqual(b);
 */
export function createDataCacheScenario<Compartments extends Record<string, any>>(
  token: AppStorageToken,
  policy: Compartments,
): DataCacheScenario<Compartments> {
  const cache = createDataCache<Compartments>(token, policy);
  function createProxy<T>(name: keyof Compartments): Promise<T> {
    return new Promise((resolve, reject) => {
      cache.observe$<T>(name).subscribe({
        next: (val) => resolve(val),
        error: (err) => reject(err),
      });
    });
  }

  async function waitForAllCompartments(): Promise<void> {
    const waits = Object.keys(policy).map((key) => {
      return new Promise<void>((resolve) => {
        const compartment = cache.findCompartment(key as keyof Compartments) as DataCompartment<any>;
        if (compartment.options.loadingOptions?.strategy !== 'auto') {
          resolve();
          return;
        }

        // eslint-disable-next-line prefer-const
        let initializedSub: Subscription | undefined;

        function clearSub(): void {
          if (!initializedSub) {
            return;
          }

          initializedSub.unsubscribe();
        }
        initializedSub = compartment.initialized$.pipe(filter((x) => x === true)).subscribe({
          next: () => {
            clearSub();
            resolve();
          },
          error: () => {
            clearSub();
            resolve();
          },
        });
      });
    });

    await Promise.all(waits);
  }

  return {
    cache,
    createProxy,
    waitForAllCompartments,
  };
}

export class Latch {
  private readonly semaphore = new Semaphore(1);

  get isLatched() {
    return this.semaphore.isLocked();
  }

  async execute(action: () => Promise<void>): Promise<void> {
    await this.semaphore.runExclusive(async () => {
      await action();
    });
  }
}
