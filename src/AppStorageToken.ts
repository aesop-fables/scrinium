export type ScriniumToken = (AppStorageToken | DataCompartmentToken) & {
  matches(val: ScriniumToken): boolean;
};

export class AppStorageToken {
  constructor(readonly key: string) {}

  get value(): string {
    return this.key;
  }

  compartment<Compartments>(key: keyof Compartments): DataCompartmentToken {
    return new DataCompartmentToken(key as string, this);
  }

  append(key: string): DataCompartmentToken {
    return new DataCompartmentToken(key, this);
  }

  equals(val: ScriniumToken) {
    return tokenEquals(this, val);
  }

  matches(val: ScriniumToken): boolean {
    throw new Error('Method not implemented.');
  }
}

// TODO -- Consolidate down to AppStorageToken
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

  matches(val: ScriniumToken): boolean {
    throw new Error('Method not implemented.');
  }
}

export function tokenEquals(a: ScriniumToken, b: ScriniumToken) {
  return a.value === b.value;
}
