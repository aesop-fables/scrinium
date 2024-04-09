import { ISubject } from './ISubject';

export declare type Predicate = ISubject<boolean>;

// eslint-disable-next-line @typescript-eslint/ban-types
declare type Constructor = Function;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare type PredicateIdentifier = string;

const metadataKey = Symbol('@aesop-fables/scrinium/predicates/metadata');

// eslint-disable-next-line @typescript-eslint/ban-types
export const getPredicateMetadata = (constructor: Constructor) => {
  const metadata = Reflect.getMetadata(metadataKey, constructor);
  return metadata as PredicateIdentifier | undefined;
};

export function predicate(lookup: PredicateIdentifier) {
  return function (target: Constructor) {
    Reflect.defineMetadata(metadataKey, lookup, target);
  };
}
