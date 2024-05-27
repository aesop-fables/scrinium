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

export class SubjectResolver implements ISubjectResolver {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly cache: any = {};
  constructor(@injectContainer() private readonly container: IServiceContainer) {}

  resolveSubject<T>(clazz: Newable<ISubject<T>>): Observable<T> {
    const key = clazz as unknown as string;
    let subject = this.cache[key] as ISubject<T>;
    if (typeof subject === 'undefined') {
      subject = this.container.resolve<ISubject<T>>(clazz);
      this.cache[key] = subject;
    }

    const target$ = subject.createObservable();
    const predicateCtor = getPredicateMetadata(clazz);
    let predicate$: Observable<boolean> | undefined = undefined;
    if (typeof predicateCtor === 'string') {
      predicate$ = this.resolveSubjectByKey<boolean>(predicateCtor as string);
    }

    if (typeof predicate$ !== 'undefined') {
      return combineLatest([predicate$, target$]).pipe(
        filter(([predicate]) => predicate),
        map(([, target]) => target),
      );
    }

    return target$;
  }

  resolveSubjectByKey<T>(key: string): Observable<T> {
    const subject = this.container.get<ISubject<T>>(key);
    const target$ = subject.createObservable();
    const predicateCtor = getPredicateMetadata(subject.constructor);
    let predicate$: Observable<boolean> | undefined = undefined;
    if (typeof predicateCtor === 'string') {
      predicate$ = this.resolveSubjectByKey<boolean>(predicateCtor as string);
    }

    if (typeof predicate$ !== 'undefined') {
      return combineLatest([predicate$, target$]).pipe(
        filter(([predicate]) => predicate),
        map(([, target]) => target),
      );
    }

    return target$;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class SubjectResolutionInterceptor<T = any> implements IInterceptor<Observable<T>> {
  private _value: Observable<T> | undefined;

  constructor(private readonly key: string) {}

  resolve(currentValue: Observable<T> | undefined, container: IServiceContainer, errors: Stack<Error>): Observable<T> {
    if (errors.size() !== 0) {
      errors.pop();
    }

    if (typeof this._value === 'undefined') {
      const resolver = container.get<ISubjectResolver>(ScriniumServices.SubjectResolver);
      this._value = resolver.resolveSubjectByKey(this.key);
    }

    return this._value;
  }
}

export function injectSubject(key: string) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (constructor: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const chain = interceptorChainFor(constructor, parameterIndex);
    chain.add(new SubjectResolutionInterceptor(key));
  };
}
