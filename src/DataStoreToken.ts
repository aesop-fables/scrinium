/* eslint-disable @typescript-eslint/no-unused-vars */
export class DataStoreToken {
  private static readonly separator = '/';

  constructor(readonly key: string) {}

  get value(): string {
    return this.key;
  }

  compartment<Compartments>(key: keyof Compartments): DataStoreToken {
    return new DataStoreToken(`${this.key}${DataStoreToken.separator}${key as string}`);
  }

  isChildOf(val: DataStoreToken) {
    return this.value.startsWith(`${val.value}${DataStoreToken.separator}`);
  }

  isParentOf(val: DataStoreToken) {
    return val.value.startsWith(`${this.value}${DataStoreToken.separator}`);
  }

  equals(val: DataStoreToken) {
    return val.value === this.value;
  }
}
