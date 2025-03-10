/* eslint-disable @typescript-eslint/no-explicit-any */
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ConfiguredDataSource } from '../ConfiguredDataSource';
import { IDataCompartmentSource } from '../IDataCompartmentSource';
import { wait, waitUntil } from '../tasks';
import { Predicate } from '../Predicate';
import { ISystemClock } from '../System';
import { DataCompartment, EventType, InitializedEvent, ResetEvent } from '../DataCompartment';
import { cacheForSeconds, ChangeRecord } from '../Compartments';
import { DataStoreToken } from '../DataStoreToken';

interface User {
  name: string;
}

const storageToken = new DataStoreToken('cacheStorage');

describe('DataCompartment', () => {
  const now = Date.now();
  let snapshot: ISystemClock;
  beforeEach(() => {
    snapshot = {
      now: () => now,
    };
  });

  test('onChange does not publish for initial load', async () => {
    const compartment = new DataCompartment<User | undefined>(storageToken.compartment('test'), {
      source: new ConfiguredDataSource<User>(async () => ({
        name: 'Test',
      })),
      defaultValue: undefined,
      retention: { policies: [cacheForSeconds(1)] },
    });

    let changeRecord: ChangeRecord<User | undefined> | undefined;
    compartment.addEventListener('change', ({ details: record }) => {
      changeRecord = record as ChangeRecord;
    });

    await compartment.reload();

    expect(changeRecord).toBeDefined();
    expect(changeRecord?.previous).toBeUndefined();
    expect(changeRecord?.current).toEqual({ name: 'Test' });
  });

  test('does not publish initialized on subsequent reloads', async () => {
    const compartment = new DataCompartment<User | undefined>(storageToken.compartment('test'), {
      source: new ConfiguredDataSource<User>(async () => ({
        name: 'Test',
      })),
      defaultValue: undefined,
      retention: { policies: [cacheForSeconds(1)] },
    });

    const invocations: Record<EventType, number> = {
      change: 0,
      initialized: 0,
      reset: 0,
    };

    compartment.addEventListener('initialized', () => {
      ++invocations.initialized;
    });

    compartment.addEventListener('change', () => {
      ++invocations.change;
    });

    compartment.addEventListener('reset', () => {
      ++invocations.reset;
    });

    await compartment.reload();
    await compartment.reload();

    expect(invocations.change).toBe(1);
    expect(invocations.reset).toBe(0);
    expect(invocations.initialized).toBe(1);
  });

  test('initialized publishes for initial load', async () => {
    const compartment = new DataCompartment<User | undefined>(storageToken.compartment('test'), {
      source: new ConfiguredDataSource<User>(async () => ({
        name: 'Test',
      })),
      defaultValue: undefined,
      retention: { policies: [cacheForSeconds(1)] },
    });

    let value: User | undefined;
    compartment.addEventListener('initialized', ({ details: record }) => {
      value = (record as InitializedEvent).value;
    });

    await compartment.reload();

    expect(value).toEqual({ name: 'Test' });
  });

  test('publishes reset event with default value', async () => {
    const compartment = new DataCompartment<User | undefined>(storageToken.compartment('test'), {
      source: new ConfiguredDataSource<User>(async () => ({
        name: 'Test',
      })),
      defaultValue: undefined,
      retention: { policies: [cacheForSeconds(1)] },
    });

    let value: User | undefined;
    let invoked = false;
    compartment.addEventListener('reset', ({ details: record }) => {
      value = (record as ResetEvent).value;
      invoked = true;
    });

    await compartment.reload();
    await compartment.reset();

    expect(value).toBeUndefined();
    expect(invoked).toBeTruthy();
  });

  test('unsubscribes onChange subscription', async () => {
    const compartment = new DataCompartment<User | undefined>(storageToken.compartment('test'), {
      source: new ConfiguredDataSource<User>(async () => ({
        name: 'Test',
      })),
      defaultValue: undefined,
      retention: { policies: [cacheForSeconds(1)] },
    });

    let changeRecord: ChangeRecord<User | undefined> | undefined;
    const subscription = compartment.addEventListener('change', ({ details: record }) => {
      changeRecord = record as ChangeRecord;
    });

    subscription.unsubscribe();

    await compartment.reload();

    expect(changeRecord).toBeUndefined();
  });

  describe('isExpired', () => {
    test('returns false when the compartment has not expired', async () => {
      const timestamp = Date.now();
      const compartment = new DataCompartment<User | undefined>(storageToken.compartment('test'), {
        source: new ConfiguredDataSource<User>(async () => ({
          name: 'Test',
        })),
        defaultValue: undefined,
        retention: { policies: [cacheForSeconds(1)] },
        system: {
          clock: {
            now() {
              return timestamp;
            },
          },
        },
      });

      await compartment.reload();

      expect(compartment.isExpired).toBeFalsy();
    });

    test('returns true when the compartment has expired', async () => {
      let timestamp = Date.now();
      const compartment = new DataCompartment<User | undefined>(storageToken.compartment('test'), {
        source: new ConfiguredDataSource<User>(async () => ({
          name: 'Test',
        })),
        defaultValue: undefined,
        retention: { policies: [cacheForSeconds(1)] },
        system: {
          clock: {
            now() {
              return timestamp;
            },
          },
        },
      });

      await compartment.reload();

      timestamp += 3000;
      expect(compartment.isExpired).toBeTruthy();
    });
  });

  describe('Auto Loading', () => {
    describe('When no predicate is specified', () => {
      test('Initializes', async () => {
        const user: User = { name: 'Test' };
        const compartment = new DataCompartment<User | undefined>(storageToken.compartment('test'), {
          source: new ConfiguredDataSource<User>(async () => user),
          defaultValue: undefined,
          system: { clock: snapshot },
        });

        expect(
          await waitUntil(() => firstValueFrom(compartment.initialized$), {
            millisecondPolling: 10,
            timeoutInMilliseconds: 100,
          }),
        ).toBeTruthy();

        expect(await firstValueFrom(compartment.lastLoaded$)).toBe(now);
      });
    });

    describe('When a predicate is specified', () => {
      test('Waits for the predicate to publish true', async () => {
        const user: User = { name: 'Test' };
        const predicateSubject = new BehaviorSubject<boolean>(false);
        const predicate: Predicate = {
          createObservable() {
            return predicateSubject.pipe();
          },
        };

        const compartment = new DataCompartment<User | undefined>(storageToken.compartment('test'), {
          loadingOptions: {
            strategy: 'auto',
            predicate,
          },
          source: new ConfiguredDataSource<User>(async () => user),
          defaultValue: undefined,
        });

        expect(
          await waitUntil(() => firstValueFrom(compartment.initialized$), {
            millisecondPolling: 10,
            timeoutInMilliseconds: 100,
          }),
        ).toBeFalsy();

        predicateSubject.next(true);

        expect(
          await waitUntil(() => firstValueFrom(compartment.initialized$), {
            millisecondPolling: 10,
            timeoutInMilliseconds: 100,
          }),
        ).toBeTruthy();
      });
    });
  });

  describe('Manual Loading', () => {
    describe('When no predicate is specified', () => {
      test('Initializes', async () => {
        const user: User = { name: 'Test' };
        const compartment = new DataCompartment<User | undefined>(storageToken.compartment('test'), {
          loadingOptions: {
            strategy: 'manual',
          },
          source: new ConfiguredDataSource<User>(async () => user),
          defaultValue: undefined,
          system: { clock: snapshot },
        });

        expect(await firstValueFrom(compartment.initialized$)).toBeFalsy();

        compartment.reload();

        expect(
          await waitUntil(() => firstValueFrom(compartment.initialized$), {
            millisecondPolling: 10,
            timeoutInMilliseconds: 100,
          }),
        ).toBeTruthy();

        expect(await firstValueFrom(compartment.lastLoaded$)).toBe(now);
      });
    });
  });

  class DeferredDataSource<T> implements IDataCompartmentSource<T> {
    private readonly promise: Promise<T>;
    resolve?: (val: T) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reject?: (err: any) => void;

    constructor() {
      this.promise = new Promise<T>((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });
    }

    load(): Promise<T> {
      return this.promise;
    }
  }

  describe('Lazy Loading', () => {
    test('triggering the initialization signals loading$', async () => {
      const user: User = { name: 'Test' };
      const deferredSource = new DeferredDataSource<User>();
      const compartment = new DataCompartment<User | undefined>(storageToken.compartment('test'), {
        loadingOptions: {
          strategy: 'lazy',
        },
        source: deferredSource,
        defaultValue: undefined,
      });

      const subscriber = {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        next() {},
      };
      compartment.value$.subscribe(subscriber);

      expect(
        await waitUntil(() => firstValueFrom(compartment.loading$), {
          millisecondPolling: 10,
          timeoutInMilliseconds: 100,
        }),
      ).toBeTruthy();

      deferredSource.resolve && deferredSource.resolve(user);

      await wait(100);

      expect(
        await waitUntil(() => firstValueFrom(compartment.loading$), {
          millisecondPolling: 10,
          timeoutInMilliseconds: 100,
        }),
      ).toBeFalsy();
    });

    test('Initializes when initialized$ is called', async () => {
      const compartment = new DataCompartment<User | undefined>(storageToken.compartment('test'), {
        loadingOptions: {
          strategy: 'lazy',
        },
        source: new ConfiguredDataSource<User | undefined>(async () => {
          return undefined;
        }),
        defaultValue: undefined,
        system: { clock: snapshot },
      });

      expect(await firstValueFrom(compartment.initialized$)).toBeFalsy();

      expect(
        await waitUntil(() => firstValueFrom(compartment.initialized$), {
          millisecondPolling: 10,
          timeoutInMilliseconds: 1000,
        }),
      ).toBeTruthy();

      expect(await firstValueFrom(compartment.lastLoaded$)).toBe(now);
    });

    test('Invokes the onLoad callback', async () => {
      let invoked = false;
      const compartment = new DataCompartment<User | undefined>(storageToken.compartment('test'), {
        loadingOptions: {
          strategy: 'lazy',
        },
        source: new ConfiguredDataSource<User | undefined>(async () => {
          return undefined;
        }),
        defaultValue: undefined,
        system: { clock: snapshot },
        onLoad() {
          invoked = true;
        },
      });

      expect(
        await waitUntil(() => firstValueFrom(compartment.initialized$), {
          millisecondPolling: 10,
          timeoutInMilliseconds: 1000,
        }),
      ).toBeTruthy();

      expect(invoked).toBeTruthy();
    });

    test('Does not invoke the onLoad callback when an error occurs', async () => {
      let invoked = false;
      const compartment = new DataCompartment<User | undefined>(storageToken.compartment('test'), {
        loadingOptions: {
          strategy: 'lazy',
        },
        source: new ConfiguredDataSource<User | undefined>(async () => {
          throw new Error('intentional');
        }),
        defaultValue: undefined,
        system: { clock: snapshot },
        onLoad() {
          invoked = true;
        },
      });

      try {
        await waitUntil(() => firstValueFrom(compartment.initialized$), {
          millisecondPolling: 10,
          timeoutInMilliseconds: 200,
        });
      } catch {
        // Just swallow it
      } finally {
        expect(invoked).toBeFalsy();
      }
    });

    test('Reloads the data when the compartment cache token has expired', async () => {
      let currentTimestamp = Date.now();
      const clock: ISystemClock = {
        now() {
          return currentTimestamp;
        },
      };

      let nrLoads = 0;
      const compartment = new DataCompartment<User | undefined>(storageToken.compartment('test'), {
        loadingOptions: {
          strategy: 'lazy',
        },
        source: new ConfiguredDataSource<User | undefined>(async () => {
          ++nrLoads;
          return undefined;
        }),
        defaultValue: undefined,
        system: { clock },
        retention: { policies: [cacheForSeconds(30)] },
      });

      expect(
        await waitUntil(() => firstValueFrom(compartment.initialized$), {
          millisecondPolling: 10,
          timeoutInMilliseconds: 1000,
        }),
      ).toBeTruthy();

      expect(await firstValueFrom(compartment.lastLoaded$)).toBe(currentTimestamp);
      expect(nrLoads).toBe(1);

      currentTimestamp += 30000 * 2;
      expect(
        await waitUntil(() => firstValueFrom(compartment.initialized$), {
          millisecondPolling: 10,
          timeoutInMilliseconds: 1000,
        }),
      ).toBeTruthy();

      expect(await firstValueFrom(compartment.lastLoaded$)).toBe(currentTimestamp);
      expect(nrLoads).toBe(2);
    });

    describe('When no predicate is specified', () => {
      test('Initializes when value$ is called', async () => {
        const user: User = { name: 'Test' };
        let count = 0;
        const compartment = new DataCompartment<User | undefined>(storageToken.compartment('test'), {
          loadingOptions: {
            strategy: 'lazy',
          },
          source: new ConfiguredDataSource<User>(async () => {
            ++count;
            return user;
          }),
          defaultValue: undefined,
        });

        expect(await firstValueFrom(compartment.initialized$)).toBeFalsy();

        let value: User | undefined;
        const subscriber = {
          next(val: User | undefined) {
            value = val;
          },
        };
        compartment.value$.subscribe(subscriber);
        compartment.value$.subscribe(subscriber);
        compartment.value$.subscribe(subscriber);

        expect(
          await waitUntil(() => firstValueFrom(compartment.initialized$), {
            millisecondPolling: 10,
            timeoutInMilliseconds: 500,
          }),
        ).toBeTruthy();

        expect(value).toBe(user);
        expect(count).toBe(1);
      });
    });

    describe('When a predicate is specified', () => {
      test('Waits for the predicate to publish true', async () => {
        const user: User = { name: 'Test' };
        const predicateSubject = new BehaviorSubject<boolean>(false);
        const predicate: Predicate = {
          createObservable() {
            return predicateSubject.pipe();
          },
        };

        const compartment = new DataCompartment<User | undefined>(storageToken.compartment('test'), {
          loadingOptions: {
            strategy: 'lazy',
            predicate,
          },
          source: new ConfiguredDataSource<User>(async () => user),
          defaultValue: undefined,
        });

        expect(
          await waitUntil(() => firstValueFrom(compartment.initialized$), {
            millisecondPolling: 10,
            timeoutInMilliseconds: 100,
          }),
        ).toBeFalsy();

        let value: User | undefined;
        compartment.value$.subscribe({
          next(val) {
            value = val;
          },
        });

        expect(
          await waitUntil(() => firstValueFrom(compartment.initialized$), {
            millisecondPolling: 10,
            timeoutInMilliseconds: 100,
          }),
        ).toBeFalsy();

        predicateSubject.next(true);

        expect(
          await waitUntil(() => firstValueFrom(compartment.initialized$), {
            millisecondPolling: 10,
            timeoutInMilliseconds: 100,
          }),
        ).toBeTruthy();

        expect(value).toBe(user);
      });
    });
  });

  type CompartmentModel = { id: string };

  describe('getCompartmentState', () => {
    test('initialized is true', async () => {
      const compartment = new DataCompartment<CompartmentModel | undefined>(storageToken.compartment('test'), {
        loadingOptions: { strategy: 'manual' },
        defaultValue: undefined,
        source: {
          async load() {
            return { id: 'test' };
          },
        },
      });

      await compartment.reload();
      const state = compartment.getCompartmentState();
      expect(state.initialized).toBeTruthy();
    });

    test('initialized is false', async () => {
      const compartment = new DataCompartment<CompartmentModel | undefined>(storageToken.compartment('test'), {
        loadingOptions: { strategy: 'manual' },
        defaultValue: undefined,
        source: {
          async load() {
            return { id: 'test' };
          },
        },
      });

      const state = compartment.getCompartmentState();
      expect(state.initialized).toBeFalsy();
    });

    test('loading is true', async () => {
      const source = new DeferredDataSource<CompartmentModel>();
      const compartment = new DataCompartment<CompartmentModel | undefined>(storageToken.compartment('test'), {
        loadingOptions: { strategy: 'manual' },
        defaultValue: undefined,
        source,
      });

      compartment.reload();
      await wait(10);

      const state = compartment.getCompartmentState();
      expect(state.loading).toBeTruthy();
    });

    test('loading is false', async () => {
      const compartment = new DataCompartment<CompartmentModel | undefined>(storageToken.compartment('test'), {
        loadingOptions: { strategy: 'manual' },
        defaultValue: undefined,
        source: {
          async load() {
            return { id: 'test' };
          },
        },
      });

      await compartment.reload();
      const state = compartment.getCompartmentState();
      expect(state.loading).toBeFalsy();
    });

    test('error exists', async () => {
      const compartment = new DataCompartment<CompartmentModel | undefined>(storageToken.compartment('test'), {
        loadingOptions: { strategy: 'manual' },
        defaultValue: undefined,
        source: {
          async load() {
            throw new Error('intentional');
          },
        },
      });

      await compartment.reload();
      const state = compartment.getCompartmentState();
      expect(state.error).toBeDefined();
    });

    test('error does not exist', async () => {
      const compartment = new DataCompartment<CompartmentModel | undefined>(storageToken.compartment('test'), {
        loadingOptions: { strategy: 'manual' },
        defaultValue: undefined,
        source: {
          async load() {
            return { id: 'test' };
          },
        },
      });

      await compartment.reload();
      const state = compartment.getCompartmentState();
      expect(state.error).toBeUndefined();
    });

    test('value is default value', async () => {
      const compartment = new DataCompartment<CompartmentModel | undefined>(storageToken.compartment('test'), {
        loadingOptions: { strategy: 'manual' },
        defaultValue: undefined,
        source: {
          async load() {
            return { id: 'test' };
          },
        },
      });

      const state = compartment.getCompartmentState();
      expect(state.value).toBeUndefined();
    });

    test('value is resolved', async () => {
      const value = { id: 'test' };
      const compartment = new DataCompartment<CompartmentModel | undefined>(storageToken.compartment('test'), {
        loadingOptions: { strategy: 'manual' },
        defaultValue: undefined,
        source: {
          async load() {
            return value;
          },
        },
      });

      await compartment.reload();
      const state = compartment.getCompartmentState();
      expect(state.value).toBe(value);
    });

    test('lastLoaded is resolved', async () => {
      const value = { id: 'test' };
      const compartment = new DataCompartment<CompartmentModel | undefined>(storageToken.compartment('test'), {
        loadingOptions: { strategy: 'manual' },
        defaultValue: undefined,
        source: {
          async load() {
            return value;
          },
        },
        system: { clock: snapshot },
      });

      await compartment.reload();
      const state = compartment.getCompartmentState();
      expect(state.lastLoaded).toBe(now);
    });
  });
});
