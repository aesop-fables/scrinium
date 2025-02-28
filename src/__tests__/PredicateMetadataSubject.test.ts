import { createContainer, createServiceModule, IServiceContainer } from '@aesop-fables/containr';
import 'reflect-metadata';
import { useScrinium } from '../bootstrapping';
import { BehaviorSubject, Observable, of, throwError, timeout } from 'rxjs';
import { ISubject, SubjectResolver } from '../ISubject';
import { createMetadataDecorator } from '../Metadata';
import { wait } from '../tasks';

describe('Subject Resolver Integration Tests', () => {
  let container: IServiceContainer;
  let inner: BehaviorSubject<boolean>;
  let subjectResolver: SubjectResolver;

  beforeEach(() => {
    container = createIntegrationContainer();
    inner = container.get<BehaviorSubject<boolean>>(SampleServices.observable);

    subjectResolver = container.resolve(SubjectResolver);
  });

  test('Does not resolve the subject until metadata subjects resolve', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let error: any = null;
    let success = false;

    const observable$ = subjectResolver.resolveSubject(SampleSubject);
    observable$
      .pipe(
        timeout({
          each: 100,
          with: () => throwError(() => new Error('Timed out')),
        }),
      )
      .subscribe({
        error: (err) => {
          error = err;
        },
        next: () => {
          success = true;
        },
      });

    await wait(250);
    expect(success).toBe(false);
    expect(error).not.toBe(null);
  });

  test('Resolves the subject when the metadata subjects resolve', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let error: any = null;
    let message: string | undefined;

    const observable$ = subjectResolver.resolveSubject(SampleSubject);
    observable$.subscribe({
      error: (err) => {
        error = err;
      },
      next: (msg) => {
        message = msg;
      },
    });
    inner.next(true);

    expect(error).toBe(null);
    expect(message).toBe('Hello, world!');
  });

  const SampleServices = {
    observable: 'observable',
  };

  const samplePredicate = createMetadataDecorator<boolean>((target, context) => {
    return context.container.get<BehaviorSubject<boolean>>(SampleServices.observable).pipe();
  });

  @samplePredicate
  class SampleSubject implements ISubject<string> {
    createObservable(): Observable<string> {
      return of('Hello, world!');
    }
  }

  function createIntegrationContainer() {
    return createContainer([
      useScrinium({
        modules: [],
      }),
      createServiceModule('sample', (services) => {
        services.singleton(SampleServices.observable, new BehaviorSubject<boolean>(false));
      }),
    ]);
  }
});
