import { Newable } from '@aesop-fables/containr';
import { ScriniumServices } from '../ScriniumServices';
import { IObservableQueryDispatcher } from '../queries/IObservableQueryDispatcher';
import { IObservableQuery } from '../queries/Types';
import { ObservableOptions } from './useObservable';
import { useService } from '@aesop-fables/containr-react';
import { useEffect, useMemo, useState } from 'react';
import { catchError, timeout } from 'rxjs';
import { useObservableOptions } from '../ObservableProvider';

export function useObservableQuery<Response, Params>(
  constructor: Newable<IObservableQuery<Params, Response>>,
  params: Params,
  options?: ObservableOptions,
) {
  const [state, setState] = useState<Response>();
  const [err, setErr] = useState<unknown>();
  const executor = useService<IObservableQueryDispatcher>(ScriniumServices.QueryDispatcher);
  const observable$ = useMemo(() => executor.dispatch(constructor, params), [params]);

  const ambientOptions = useObservableOptions();
  const resolvedOptions = useMemo(
    () => ({
      ...ambientOptions,
      ...options,
    }),
    [ambientOptions, options],
  );

  const target$ = useMemo(() => {
    let target = observable$;
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
  }, [target$]);

  useEffect(() => {
    if (err && options?.onError) {
      options.onError(err);
    }
  }, [err, options?.onError]);

  return state;
}
