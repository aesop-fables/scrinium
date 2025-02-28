import { IServiceContainer } from '@aesop-fables/containr';
import { useServiceContainer } from '@aesop-fables/containr-react';
import useConstant from './useConstant';
import { useObservable } from './useObservable';
import { DataStore } from '../DataStore';
import { useDataStore } from '../useDataStore';
import { Observable } from 'rxjs';
import { DataStoreToken } from '../DataStoreToken';
import { KeysOf, PredicateMetadataSubject } from '../Metadata';
import { MetadataSubjectContext } from '../MetadataSubjectContext';
import { useMemo } from 'react';

export type AnonymousPredicateContext = {
  container: IServiceContainer;
  dataStore: DataStore;
};

export function useAnonymousPredicateContext() {
  const container = useServiceContainer();
  const dataStore = useDataStore();

  return {
    container,
    dataStore,
  };
}

export type AnonymousPredicate = {
  createObservable(context: AnonymousPredicateContext): Observable<boolean>;
};

export function usePredicate<Registry>(token: DataStoreToken, keys: KeysOf<Registry> = []): boolean {
  const context = useAnonymousPredicateContext();
  const predicate$ = useConstant(() => {
    const metadataSubject = new PredicateMetadataSubject<Registry>(token, keys);
    return metadataSubject.createObservable(new MetadataSubjectContext(context.container, context.dataStore));
  });

  const resolvedValue = useObservable(predicate$);
  return useMemo(() => resolvedValue ?? false, [resolvedValue]);
}
