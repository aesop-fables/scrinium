/**
 * Represents a function used to resolve an entity by key.
 */
export declare type ILookupResolver<Key, Value> = (key: Key) => Value;
/**
 * Represents an in-memory cache that allows values to be resolved on-demand.
 */
export interface ILookup<Key extends string | number, Value> {
  /**
   * Looks up the value or the specified key.
   * If the value has already been resolved, the cached value will be returned; otherwise,
   * the value will be resolved.
   * @param key The key of the value to retrieve.
   */
  find(key: Key): Value;
  /**
   * Stores the specified key/value pair and replaces the cached value.
   * @param key The key to override.
   * @param value The value to override.
   */
  inject(key: Key, value: Value): void;
  /**
   * Clears the specified key and invalidates the cache.
   * @param key The key to invalidate.
   */
  clear(key: Key): void;
}
/**
 * Represents a simple hash (JSON object).
 */
export declare type Hash<Value> = { [key: string | number]: Value };
/**
 * Represents an in-memory cache that allows values to be resolved on-demand.
 */
export class Lookup<Key extends string | number, Value> implements ILookup<Key, Value> {
  private readonly values: Hash<Value>;
  constructor(private readonly resolver: ILookupResolver<Key, Value>) {
    this.values = {};
  }
  /**
   * Stores the specified key/value pair and replaces the cached value.
   * @param key The key to override.
   * @param value The value to override.
   */
  inject(key: Key, value: Value): void {
    this.values[key] = value;
  }
  /**
   * Looks up the value or the specified key.
   * If the value has already been resolved, the cached value will be returned; otherwise,
   * the value will be resolved.
   * @param key The key of the value to retrieve.
   */
  find(key: Key): Value {
    let value = this.values[key];
    if (typeof value === 'undefined') {
      value = this.resolver(key);
      this.values[key] = value;
    }

    return value;
  }
  /**
   * Clears the specified key and invalidates the cache.
   * @param key The key to invalidate.
   */
  clear(key: Key): void {
    delete this.values[key];
  }
}
