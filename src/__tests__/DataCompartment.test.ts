import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ConfiguredDataSource, DataCompartment, IDataCompartmentSource } from '../Compartments';
import { wait, waitUntil } from '../tasks';
import { Predicate } from '../Predicate';

interface User {
  name: string;
}
describe('DataCompartment', () => {
  describe('Auto Loading', () => {
    describe('When no predicate is specified', () => {
      test('Initializes', async () => {
        const user: User = { name: 'Test' };
        const compartment = new DataCompartment<User | undefined>('test', {
          source: new ConfiguredDataSource<User>(async () => user),
          defaultValue: undefined,
        });

        expect(
          await waitUntil(() => firstValueFrom(compartment.initialized$), {
            millisecondPolling: 10,
            timeoutInMilliseconds: 100,
          }),
        ).toBeTruthy();
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

        const compartment = new DataCompartment<User | undefined>('test', {
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
        const compartment = new DataCompartment<User | undefined>('test', {
          loadingOptions: {
            strategy: 'manual',
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

        compartment.reload();

        expect(
          await waitUntil(() => firstValueFrom(compartment.initialized$), {
            millisecondPolling: 10,
            timeoutInMilliseconds: 100,
          }),
        ).toBeTruthy();
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

        const compartment = new DataCompartment<User | undefined>('test', {
          loadingOptions: {
            strategy: 'manual',
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

        compartment.reload();

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
      const compartment = new DataCompartment<User | undefined>('test', {
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
      const compartment = new DataCompartment<User | undefined>('test', {
        loadingOptions: {
          strategy: 'lazy',
        },
        source: new ConfiguredDataSource<User | undefined>(async () => {
          return undefined;
        }),
        defaultValue: undefined,
      });

      expect(await firstValueFrom(compartment.initialized$)).toBeFalsy();

      expect(
        await waitUntil(() => firstValueFrom(compartment.initialized$), {
          millisecondPolling: 10,
          timeoutInMilliseconds: 100,
        }),
      ).toBeTruthy();
    });

    describe('When no predicate is specified', () => {
      test('Initializes when value$ is called', async () => {
        const user: User = { name: 'Test' };
        let count = 0;
        const compartment = new DataCompartment<User | undefined>('test', {
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

        const compartment = new DataCompartment<User | undefined>('test', {
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
});
