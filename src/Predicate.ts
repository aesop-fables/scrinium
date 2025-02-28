import { ISubject } from './ISubject';
import {
  Constructor,
  ConstructorDecorator,
  getPredicateMetadata,
  PredicateIdentifier,
  setPredicateMetadata,
} from './Metadata';

export type Predicate = ISubject<boolean>;

export function predicate(lookup: PredicateIdentifier): ConstructorDecorator {
  return function (target: Constructor) {
    const metadata = getPredicateMetadata(target);
    setPredicateMetadata(target, [...metadata, lookup]);
  };
}
