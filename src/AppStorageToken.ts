export type ScriniumToken = AppStorageToken | DataCompartmentToken;

export class AppStorageToken {
  constructor(readonly key: string) {}

  get value(): string {
    return this.key;
  }

  append(key: string): DataCompartmentToken {
    return new DataCompartmentToken(key, this);
  }

  equals(val: ScriniumToken) {
    return tokenEquals(this, val);
  }
}

export class DataCompartmentToken {
  constructor(
    readonly key: string,
    readonly token: AppStorageToken,
  ) {}

  get value(): string {
    return `${this.token.key}/${this.key}`;
  }

  equals(val: ScriniumToken) {
    return tokenEquals(this, val);
  }
}

export function tokenEquals(a: ScriniumToken, b: ScriniumToken) {
  return a.value === b.value;
}
