import { IServiceContainer } from '@aesop-fables/containr';
import { combineLatest, map, Observable } from 'rxjs';
import { DataStore } from './DataStore';
import { DataStoreToken } from './DataStoreToken';

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

export class MetadataSubjectContext {
  constructor(
    readonly container: IServiceContainer,
    readonly store: DataStore,
  ) {}
}

export interface IMetadataSubject<T> {
  createObservable(context: MetadataSubjectContext): Observable<T>;
}

// This is the decorator shim
export function waitForCache<Compartments>(token: DataStoreToken): ConstructorDecorator {
  return function (target: Constructor) {
    const metadata = getPredicateMetadata(target);
    const resolver = new WaitForCacheMetadataPredicate<Compartments>(token, []);
    setPredicateMetadata(target, [...metadata, resolver]);
  };
}

export type KeysOf<T> = (keyof T)[];

export class WaitForCacheMetadataPredicate<Compartments> implements IMetadataSubject<boolean> {
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
