/* eslint-disable @typescript-eslint/no-explicit-any */
import { Subscription, filter } from 'rxjs';
import { DataCategory } from './Compartments';
import { DataCache, createDataCache } from './DataCache';
import { createTypedCached, ITypedCache } from './TypedCache';

export interface SubscriptionProxy<Compartments> {
  <T>(name: keyof Compartments): Promise<T>;
}

export interface DataCacheScenario<Compartments> {
  cache: DataCache<Compartments>;
  createProxy: SubscriptionProxy<Compartments>;
  waitForAllCompartments: () => Promise<void>;
}

export interface TypedCacheScenario<Compartments> {
  cache: ITypedCache<Compartments>;
  waitForAllCompartments: () => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createDataCacheScenario<Compartments extends Record<string, any>>(
  policy: Compartments,
): DataCacheScenario<Compartments> {
  const cache = createDataCache<Compartments>(policy);
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
        const compartment = cache.findCompartment(key as keyof Compartments);
        if (compartment.category === DataCategory.NonCritical) {
          resolve();
        }

        // eslint-disable-next-line prefer-const
        let initializedSub: Subscription | undefined;

        function clearSub(): void {
          if (!initializedSub) {
            return;
          }

          initializedSub.unsubscribe();
        }
        initializedSub = compartment
          .initialized$()
          .pipe(filter((x) => x === true))
          .subscribe({
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

export function createTypedCacheScenario<Compartments extends Record<string, any>>(
  policy: Compartments,
): TypedCacheScenario<Compartments> {
  const cache = createTypedCached<Compartments>(policy);
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
        const compartment = cache.get(key as keyof Compartments);
        if (compartment.category === DataCategory.NonCritical) {
          resolve();
        }

        // eslint-disable-next-line prefer-const
        let initializedSub: Subscription | undefined;

        function clearSub(): void {
          if (!initializedSub) {
            return;
          }

          initializedSub.unsubscribe();
        }
        initializedSub = compartment
          .initialized$()
          .pipe(filter((x) => x === true))
          .subscribe({
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
    waitForAllCompartments,
  };
}
