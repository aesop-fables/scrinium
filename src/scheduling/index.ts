import { interval, NEVER, Observer, Observable, Subject, switchMap } from 'rxjs';

export interface IInterval {
  configure(observer: Partial<Observer<number>>): IRecurringTask;
}

export interface ISchedulable {
  attach(interval: IInterval): void;
}

export interface IRecurringTask {
  start(): void;
  stop(): void;
}

export class Interval implements IInterval, IRecurringTask {
  private readonly interval: Observable<number>;
  private readonly latch: Subject<boolean>;

  constructor(period: number) {
    this.interval = interval(period);
    this.latch = new Subject();
  }

  start(): void {
    this.latch.next(false);
  }

  stop(): void {
    this.latch.next(true);
  }

  configure(observer: Partial<Observer<number>>): IRecurringTask {
    this.latch
      .pipe(switchMap((x) => (x ? (NEVER as unknown as Observable<number>) : this.interval.pipe())))
      .subscribe(observer);
    return this;
  }
}

/**
 * Creates a recurring task that occurs every period (milliseconds)
 * @param period Delay in milliseconds between each invocation
 * @param schedulable The Schedulable interface to attach the interval to
 * @returns A recurring task to start/stop the job.
 */
export function createInterval(period: number, schedulable: ISchedulable): IRecurringTask {
  const interval = new Interval(period);
  schedulable.attach(interval);

  return interval;
}
