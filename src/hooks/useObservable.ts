import { useState, useEffect } from 'react';
import { Observable, timeout } from 'rxjs';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noOp = () => {};

export declare type ObservableOptions = {
  onError?: (x: unknown) => void;
  timeout?: number;
};

export function useObservable<T>(observable: Observable<T>, options?: ObservableOptions): T | undefined {
  const [state, setState] = useState<T>();
  const [err, setErr] = useState<unknown>();

  useEffect(() => {
    let target = observable;
    if (options?.timeout) {
      target = target.pipe(timeout({ each: options.timeout }));
    }
    const sub = target.subscribe({ next: setState, error: (e) => setErr(e) });
    return () => sub.unsubscribe();
  }, []); // the effect only runs once

  useEffect(() => {
    if (err && options?.onError) {
      options.onError(err);
    }
  }, [err, options?.onError]);

  return state;
}

export const useSubscription = <T>(
  observable: Observable<T>,
  next: (x: T) => void,
  error?: (x: unknown) => void,
  complete?: () => void,
): void => {
  useEffect(() => {
    const sub = observable.subscribe({
      next,
      error: error ? error : noOp,
      complete: complete ? complete : noOp,
    });
    return () => sub.unsubscribe();
  }, [observable]); // the effect only runs once
};
