import { Observer, Observable, Subscription } from 'rxjs';
import { IListener } from './IListener';

/**
 * Provides base functionality for loading data caches (only once) based on an observable boolean value.
 */
export abstract class PredicateListener implements IListener, Partial<Observer<boolean>> {
  private initialized = false;
  constructor(private readonly predicate$: Observable<boolean>) {}

  start(): Subscription {
    return this.predicate$.subscribe(this);
  }

  next(val: boolean) {
    if (!val || this.initialized) {
      return;
    }

    this.onNext();
    this.initialized = true;
  }
  /**
   * When overriden in a child class, this function is invoked when the predicate publishes a truthy value.
   */
  abstract onNext(): void;
}
