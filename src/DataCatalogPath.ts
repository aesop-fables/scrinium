/* eslint-disable @typescript-eslint/no-explicit-any */
import { Subscription } from 'rxjs';
import { DataStoreToken } from './DataStoreToken';
import { DataCatalog } from './DataCatalog';
import { CompartmentEventListener, DataCompartment, EventType } from './DataCompartment';
import { DataCache } from './DataCache';

interface DataCatalogObserver<T = any> {
  getCompartment(catalog: DataCatalog): DataCompartment<T>;
  addEventListener(catalog: DataCatalog, type: EventType, listener: CompartmentEventListener): Subscription;
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

  addEventListener(catalog: DataCatalog, type: EventType, listener: CompartmentEventListener): Subscription {
    const compartment = this.getCompartment(catalog);
    return compartment.addEventListener(type, listener);
  }
}

export class DataCatalogPath {
  constructor(private readonly observer: DataCatalogObserver) {}

  addEventListener(catalog: DataCatalog, type: EventType, listener: CompartmentEventListener): Subscription {
    return this.observer.addEventListener(catalog, type, listener);
  }

  static fromCacheCompartment(token: DataStoreToken): DataCatalogPath {
    return new DataCatalogPath(new DataCacheObserver(token));
  }
}
