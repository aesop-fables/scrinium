/* eslint-disable @typescript-eslint/no-explicit-any */
import { Subscription } from 'rxjs';
import { ChangeSubscription } from './Compartments';
import { DataStoreToken } from './DataStoreToken';
import { DataCatalog } from './DataStore';

export interface DataCatalogObserver<T = any> {
  subscribe(catalog: DataCatalog, onChange: ChangeSubscription<T>): Subscription;
}

export class DataCatalogPath {
  constructor(private readonly observer: DataCatalogObserver) {}

  addChangeListener<T>(catalog: DataCatalog, onChange: ChangeSubscription<T>): Subscription {
    return this.observer.subscribe(catalog, onChange);
  }

  static fromCache(token: DataStoreToken): DataCatalogPath {
    console.log(token);
    throw new Error('Method not implemented.');
  }
}
