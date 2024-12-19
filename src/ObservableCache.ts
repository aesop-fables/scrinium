import { CompartmentComparer } from './Compartments';
import { ConfiguredDataSource } from './ConfiguredDataSource';
import { DataCompartment } from './DataCompartment';
import { Predicate } from './Predicate';

export type ObservableCacheOptions<Key, Value> = {
  loadingPredicate?: Predicate;
  defaultValue: Value;
  comparer?: CompartmentComparer<Value>;
  onError?: (error: Error) => void;
  source: (key: Key) => Promise<Value>;
};

export class ObservableCache<Key extends string | number | symbol, Value> {
  private readonly values: Record<Key, DataCompartment<Value>> = {} as Record<Key, DataCompartment<Value>>;

  constructor(private readonly options: ObservableCacheOptions<Key, Value>) {}

  get(key: Key): DataCompartment<Value> {
    let existing = this.values[key] as DataCompartment<Value>;
    if (!existing) {
      existing = new DataCompartment<Value>('observableCache', {
        defaultValue: this.options.defaultValue,
        comparer: this.options.comparer,
        onError: this.options.onError,
        loadingOptions: {
          strategy: 'lazy',
          predicate: this.options.loadingPredicate,
        },
        source: new ConfiguredDataSource<Value>(async () => this.options.source(key)),
      });
      this.values[key] = existing;
    }

    return existing;
  }

  has(key: Key): boolean {
    return typeof this.values[key] !== 'undefined';
  }

  clear(key: Key): void {
    if (!this.has(key)) {
      return;
    }

    this.get(key).reset();
  }

  reset(): void {
    Object.keys(this.values).forEach((x) => this.clear(x as Key));
  }
}
