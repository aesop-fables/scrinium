import { useState, useEffect, useMemo } from 'react';
import { Observable, catchError, timeout } from 'rxjs';
import { useObservableOptions } from '../ObservableProvider';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noOp = () => {};

export declare type ObservableOptions = {
  errorHandler?: (x: unknown) => void;
  onError?: (x: unknown) => void;
  timeout?: number;
};

export function useObservable<T>(observable: Observable<T>, options?: ObservableOptions): T | undefined {
  const [state, setState] = useState<T>();
  const [err, setErr] = useState<unknown>();
  const ambientOptions = useObservableOptions();
  const resolvedOptions = useMemo(
    () => ({
      ...ambientOptions,
      ...options,
    }),
    [ambientOptions, options],
  );

  const target$ = useMemo(() => {
    let target = observable;
    if (resolvedOptions?.timeout) {
      target = target.pipe(timeout({ each: resolvedOptions.timeout }));
    }

    if (resolvedOptions?.errorHandler) {
      target = target.pipe(
        catchError((err) => {
          resolvedOptions?.errorHandler && resolvedOptions.errorHandler(err);
          throw err;
        }),
      );
    }

    return target;
  }, [resolvedOptions]);

  useEffect(() => {
    const sub = target$.subscribe({ next: setState, error: (e) => setErr(e) });
    return () => sub.unsubscribe();
  }, [target$]); // the effect only runs once

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
