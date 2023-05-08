import { IServiceContainer, Newable } from '@aesop-fables/containr';
import { Observable } from 'rxjs';

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
  constructor(private readonly container: IServiceContainer) {}

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
