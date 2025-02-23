import {
  IInterceptor,
  IServiceContainer,
  Newable,
  Stack,
  inject,
  injectContainer,
  interceptorChainFor,
} from '@aesop-fables/containr';
import { Observable, combineLatest, filter, map } from 'rxjs';
import { ScriniumServices } from './ScriniumServices';
import { getPredicateMetadata, IMetadataSubject, PredicateIdentifier } from './Metadata';
import { DataStore } from './DataStore';
import { MetadataSubjectContext } from './MetadataSubjectContext';

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

export type PredicateResolutionContext = {
  container: IServiceContainer;
  dataStore: DataStore;
  predicateKeys: PredicateIdentifier[];
  resolver: ISubjectResolver;
};

export function resolvePredicate(context: PredicateResolutionContext) {
  const { container, dataStore, predicateKeys, resolver } = context;
  let predicate$: Observable<boolean> | undefined = undefined;
  if (typeof predicateKeys !== 'undefined' && predicateKeys.length > 0) {
    const predicates = predicateKeys.map((identifier) => {
      if (typeof identifier === 'string') {
        return resolver.resolveSubjectByKey<boolean>(identifier);
      }

      if (typeof identifier === 'object' && typeof identifier.createObservable === 'function') {
        const metadata = identifier as IMetadataSubject<boolean>;
        const metadataContext = new MetadataSubjectContext(container, dataStore);
        return metadata.createObservable(metadataContext);
      }

      throw new Error('Invalid predicate identifier');
    });

    predicate$ = combineLatest(predicates).pipe(map((x) => x.every((predicate) => predicate)));
  }

  return predicate$;
}

function resolveSubject<T>(
  subject: ISubject<T>,
  predicateKeys: PredicateIdentifier[],
  container: IServiceContainer,
  dataStore: DataStore,
  resolver: ISubjectResolver,
): Observable<T> {
  const target$ = subject.createObservable();
  const predicate$ = resolvePredicate({ container, dataStore, predicateKeys, resolver });

  if (typeof predicate$ !== 'undefined') {
    return combineLatest([predicate$, target$]).pipe(
      filter(([predicate]) => predicate),
      map(([, target]) => target),
    );
  }

  return target$;
}

export class SubjectResolver implements ISubjectResolver {
  constructor(
    @injectContainer() private readonly container: IServiceContainer,
    @inject(ScriniumServices.DataStore) private readonly dataStore: DataStore,
  ) {}

  resolveSubject<T>(clazz: Newable<ISubject<T>>): Observable<T> {
    const subject = this.container.resolve<ISubject<T>>(clazz);
    const predicateKeys = getPredicateMetadata(clazz);
    return resolveSubject(subject, predicateKeys, this.container, this.dataStore, this);
  }

  resolveSubjectByKey<T>(key: string): Observable<T> {
    const subject = this.container.get<ISubject<T>>(key);
    const predicateKeys = getPredicateMetadata(subject.constructor);
    return resolveSubject(subject, predicateKeys, this.container, this.dataStore, this);
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
