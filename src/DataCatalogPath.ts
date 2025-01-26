/* eslint-disable @typescript-eslint/no-explicit-any */
import { Subscription } from 'rxjs';
import { ChangeSubscription } from './Compartments';
import { DataStoreToken } from './DataStoreToken';
import { DataCatalog } from './DataCatalog';
import { ChangeEvent, DataCompartment } from './DataCompartment';
import { DataCache } from './DataCache';

interface DataCatalogObserver<T = any> {
  getCompartment(catalog: DataCatalog): DataCompartment<T>;
  subscribe(catalog: DataCatalog, onChange: ChangeSubscription<T>): Subscription;
}

class DataCacheObserver<T = any> implements DataCatalogObserver<T> {
  constructor(private readonly token: DataStoreToken) {}

  getCompartment(catalog: DataCatalog): DataCompartment<T> {
    const cacheToken = this.token.parent;
    if (!cacheToken) {
      throw new Error(`${this.token.key} is not a child token.`);
    }

    const type = catalog.describe(cacheToken);
    if (type !== 'cache') {
      throw new Error(
        `Attempted to subscribe to a non-cache compartment. Token: ${cacheToken.value} is of type ${type}`,
      );
    }

    const cache = catalog.get(cacheToken) as DataCache<any>;
    const compartment = cache.findCompartment(this.token) as DataCompartment<T>;
    if (!compartment) {
      throw new Error(`Compartment ${this.token.value} not found in cache ${cacheToken.value}`);
    }

    return compartment;
  }

  subscribe(catalog: DataCatalog, onChange: ChangeSubscription<T>): Subscription {
    const compartment = this.getCompartment(catalog);
    return compartment.addEventListener('change', ({ details }) => onChange(details as ChangeEvent));
  }
}

export class DataCatalogPath {
  constructor(private readonly observer: DataCatalogObserver) {}

  addChangeListener<T>(catalog: DataCatalog, onChange: ChangeSubscription<T>): Subscription {
    return this.observer.subscribe(catalog, onChange);
  }

  static fromCacheCompartment(token: DataStoreToken): DataCatalogPath {
    return new DataCatalogPath(new DataCacheObserver(token));
  }
}
