import {
  IInterceptor,
  IServiceContainer,
  Newable,
  Stack,
  injectContainer,
  interceptorChainFor,
} from '@aesop-fables/containr';
import { Observable } from 'rxjs';
import { DataCacheServices } from './bootstrapping/DataCacheServices';

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

    return subject.createObservable();
  }

  resolveSubjectByKey<T>(key: string): Observable<T> {
    const subject = this.container.get<ISubject<T>>(key);
    return subject.createObservable();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class SubjectResolutionInterceptor<T = any> implements IInterceptor<Observable<T>> {
  constructor(private readonly key: string) {}

  resolve(currentValue: Observable<T> | undefined, container: IServiceContainer, errors: Stack<Error>): Observable<T> {
    if (errors.size() !== 0) {
      errors.pop();
    }

    const resolver = container.get<ISubjectResolver>(DataCacheServices.SubjectResolver);
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
