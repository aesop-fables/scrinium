import { combineLatest, map, Observable } from 'rxjs';
import { DataStoreToken } from './DataStoreToken';
import { MetadataSubjectContext } from './MetadataSubjectContext';

export type ObservedPredicate = Observable<boolean>;

// eslint-disable-next-line @typescript-eslint/ban-types
export type Constructor = Function;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PredicateIdentifier = string | IMetadataSubject<any>;

export type ConstructorDecorator = (target: Constructor) => void;

const metadataKey = Symbol('@aesop-fables/scrinium/predicates/metadata');

export const getPredicateMetadata = (constructor: Constructor) => {
  const metadata = Reflect.getMetadata(metadataKey, constructor) ?? [];
  return metadata as PredicateIdentifier[];
};

export const setPredicateMetadata = (constructor: Constructor, metadata: PredicateIdentifier[]) => {
  Reflect.defineMetadata(metadataKey, metadata, constructor);
};

export interface IMetadataSubject<T> {
  createObservable(context: MetadataSubjectContext): Observable<T>;
}

export type KeysOf<T> = (keyof T)[];

export type MetadataSubjectAction<T> = (target: Constructor, context: MetadataSubjectContext) => Observable<T>;

class ArrowFunctionMetadataSubject<T> implements IMetadataSubject<T> {
  constructor(
    private readonly action: MetadataSubjectAction<T>,
    private readonly target: Constructor,
  ) {}

  createObservable(context: MetadataSubjectContext): Observable<T> {
    return this.action(this.target, context);
  }
}

export function createMetadataDecorator<T>(action: MetadataSubjectAction<T>): ConstructorDecorator {
  return function (target: Constructor) {
    const metadata = getPredicateMetadata(target);
    const resolver = new ArrowFunctionMetadataSubject(action, target);
    setPredicateMetadata(target, [...metadata, resolver]);
  };
}

export function createPredicateDecorator<Compartments>(
  token: DataStoreToken,
  keys: KeysOf<Compartments> = [],
): ConstructorDecorator {
  return function (target: Constructor) {
    const metadata = getPredicateMetadata(target);
    const resolver = new PredicateMetadataSubject<Compartments>(token, keys);
    setPredicateMetadata(target, [...metadata, resolver]);
  };
}

export const waitForCache = createPredicateDecorator;

// Unit test this
// Then, add unit tests to prove this also works for repositories
// THEN, we can add unit tests around the command usage
export class PredicateMetadataSubject<Compartments> implements IMetadataSubject<boolean> {
  constructor(
    readonly token: DataStoreToken,
    readonly keys: KeysOf<Compartments>,
  ) {}

  createObservable(context: MetadataSubjectContext): Observable<boolean> {
    const { store } = context;
    const cache = store.cache<Compartments>(this.token);
    if (this.keys.length === 0) {
      return cache.initialized$;
    }

    const filteredCompartments = cache.compartments.filter((x) => this.keys.includes(x.key as keyof Compartments));
    return combineLatest(filteredCompartments.map((c) => c.initialized$)).pipe(map((x) => x.every((y) => y)));
  }
}
