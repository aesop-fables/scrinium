import { Observable } from 'rxjs';
import { ISubject } from './ISubject';

export declare type Predicate = ISubject<boolean>;
export declare type ObservedPredicate = Observable<boolean>;

// eslint-disable-next-line @typescript-eslint/ban-types
declare type Constructor = Function;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare type PredicateIdentifier = string;

const metadataKey = Symbol('@aesop-fables/scrinium/predicates/metadata');

export const getPredicateMetadata = (constructor: Constructor) => {
  const metadata = Reflect.getMetadata(metadataKey, constructor) ?? [];
  return metadata as PredicateIdentifier[];
};

export function predicate(lookup: PredicateIdentifier) {
  return function (target: Constructor) {
    const metadata = getPredicateMetadata(target);
    Reflect.defineMetadata(metadataKey, [...metadata, lookup], target);
  };
}
