import {
  IInterceptor,
  IServiceContainer,
  Newable,
  Stack,
  injectContainer,
  interceptorChainFor,
} from '@aesop-fables/containr';
import { Observable, combineLatest, filter, map } from 'rxjs';
import { ScriniumServices } from './ScriniumServices';
import { getPredicateMetadata } from './Predicate';

/**
 * Subjects are essentially factories for observables.
 */
export interface ISubject<T> {
  createObservable(): Observable<T>;
}

export interface ISubjectResolver {
  resolveSubject<T>(constructor: Newable<ISubject<T>>): Observable<T>;
  resolveSubjectByKey<T>(key: string): Observable<T>;
}

function resolveSubject<T>(
  subject: ISubject<T>,
  // eslint-disable-next-line @typescript-eslint/ban-types
  predicateKeys: string[] | undefined,
  resolver: ISubjectResolver,
): Observable<T> {
  const target$ = subject.createObservable();
  let predicate$: Observable<boolean> | undefined = undefined;
  if (typeof predicateKeys !== 'undefined' && predicateKeys.length > 0) {
    const predicates = predicateKeys.map((key) => resolver.resolveSubjectByKey<boolean>(key));
    predicate$ = combineLatest(predicates).pipe(map((x) => x.every((predicate) => predicate)));
  }

  if (typeof predicate$ !== 'undefined') {
    return combineLatest([predicate$, target$]).pipe(
      filter(([predicate]) => predicate),
      map(([, target]) => target),
    );
  }

  return target$;
}

export class SubjectResolver implements ISubjectResolver {
  constructor(@injectContainer() private readonly container: IServiceContainer) {}

  resolveSubject<T>(clazz: Newable<ISubject<T>>): Observable<T> {
    const subject = this.container.resolve<ISubject<T>>(clazz);
    const predicateKeys = getPredicateMetadata(clazz);
    return resolveSubject(subject, predicateKeys, this);
  }

  resolveSubjectByKey<T>(key: string): Observable<T> {
    const subject = this.container.get<ISubject<T>>(key);
    const predicateKeys = getPredicateMetadata(subject.constructor);
    return resolveSubject(subject, predicateKeys, this);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class SubjectResolutionInterceptor<T = any> implements IInterceptor<Observable<T>> {
  constructor(private readonly key: string) {}

  resolve(currentValue: Observable<T> | undefined, container: IServiceContainer, errors: Stack<Error>): Observable<T> {
    if (errors.size() !== 0) {
      errors.pop();
    }

    const resolver = container.get<ISubjectResolver>(ScriniumServices.SubjectResolver);
    return resolver.resolveSubjectByKey(this.key);
  }
}

export function injectSubject(key: string) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (constructor: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const chain = interceptorChainFor(constructor, parameterIndex);
    chain.add(new SubjectResolutionInterceptor(key));
  };
}
