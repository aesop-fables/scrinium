export declare type ILookupResolver<Key, Value> = (key: Key) => Promise<Value>;

export interface ILookup<Key, Value> {
  find(key: Key): Promise<Value>;
}

declare type Hash<Value> = { [key: string | number]: Value };

export class Lookup<Key extends string | number, Value> implements ILookup<Key, Value> {
  private readonly values: Hash<Value>;
  constructor(private readonly resolver: ILookupResolver<Key, Value>) {
    this.values = {};
  }

  async find(key: Key): Promise<Value> {
    let value = this.values[key];
    if (typeof value === 'undefined') {
      value = await this.resolver(key);
      this.values[key] = value;
    }

    return value;
  }
}
