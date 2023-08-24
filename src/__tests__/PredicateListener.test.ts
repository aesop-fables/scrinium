import 'reflect-metadata';
import { BehaviorSubject, Observable } from 'rxjs';
import { PredicateListener } from '..';

class ConfiguredPredicateListener extends PredicateListener {
  constructor(predicate$: Observable<boolean>, private readonly callback: () => void) {
    super(predicate$);
  }

  onNext(): void {
    this.callback();
  }
}

describe('PredicateListener', () => {
  test('onNext is not called when the predicate publishes false', async () => {
    let invoked = false;
    const predicate$ = new BehaviorSubject(false);
    const listener = new ConfiguredPredicateListener(predicate$, () => {
      invoked = true;
    });

    const subscription = listener.start();
    predicate$.next(false);
    subscription.unsubscribe();

    expect(invoked).toBeFalsy();
  });
  
  test('onNext is called when when the predicate publishes true', async () => {
    let invoked = false;
    const predicate$ = new BehaviorSubject(false);
    const listener = new ConfiguredPredicateListener(predicate$, () => {
      invoked = true;
    });

    const subscription = listener.start();
    predicate$.next(true);
    subscription.unsubscribe();

    expect(invoked).toBeTruthy();
  });

  test('onNext is only called once', async () => {
    let invoked = 0;
    const predicate$ = new BehaviorSubject(false);
    const listener = new ConfiguredPredicateListener(predicate$, () => {
      invoked++;
    });

    const subscription = listener.start();
    for (let i = 0; i < 1000; i++) {
      predicate$.next(true);
    }

    subscription.unsubscribe();
    expect(invoked).toBe(1);
  });
});
