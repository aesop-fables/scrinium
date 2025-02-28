import { Newable } from '@aesop-fables/containr';
import { useService } from '@aesop-fables/containr-react';
import useConstant from './useConstant';
import { ISubject, ISubjectResolver } from '../ISubject';
import { ScriniumServices } from '../ScriniumServices';
import { ObservableOptions, useObservable } from './useObservable';

export function useSubject<T>(
  keyOrConstructor: string | Newable<ISubject<T>>,
  options?: ObservableOptions,
): T | undefined {
  const resolver = useService<ISubjectResolver>(ScriniumServices.SubjectResolver);
  const subject$ = useConstant(() => {
    if (typeof keyOrConstructor === 'string') {
      return resolver.resolveSubjectByKey<T>(keyOrConstructor);
    }

    return resolver.resolveSubject<T>(keyOrConstructor);
  });

  return useObservable(subject$, options);
}
