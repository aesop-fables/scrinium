import { createInterval, IInterval, ISchedulable, wait, waitUntil } from '..';

describe('Scheduling', () => {
  describe('Interval', () => {
    test('Always configures the service modules', async () => {
      class StubSchedulable implements ISchedulable {
        hits = 0;

        attach(interval: IInterval): void {
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          const schedulable = this;
          interval.configure({
            next(): void {
              ++schedulable.hits;
            },
          });
        }

        get nrInvocations(): number {
          return this.hits;
        }
      }

      const period = 250;
      const schedulable = new StubSchedulable();
      const interval = createInterval(period, schedulable);

      interval.start();

      await waitUntil(async () => schedulable.nrInvocations === 3, {
        millisecondPolling: 100,
        timeoutInMilliseconds: 15000,
      });

      interval.stop();

      await wait(period * 3);

      expect(schedulable.nrInvocations).toBe(3);
    });
  });
});
