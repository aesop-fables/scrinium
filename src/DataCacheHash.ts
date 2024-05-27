import { IDataCompartment } from './Compartments';
import { IDataCache } from './DataCache';
import { IDataCacheObserver } from './IDataCacheObserver';

export class DataCacheHash implements IDataCacheObserver {
  private _hash: string | undefined;

  observe(compartments: IDataCompartment[]): void {
    const hash: Record<string, string> = {};
    compartments.forEach((compartment) => {
      hash[compartment.key] = JSON.stringify(compartment.options.defaultValue);
    });

    this._hash = Object.entries(hash)
      .map(([key, val]) => `${key}=${val}`)
      .join(';');
  }

  toString() {
    return this._hash ?? '';
  }

  static from(cache: IDataCache) {
    const hash = new DataCacheHash();
    cache.observeWith(hash);

    return hash.toString();
  }
}
