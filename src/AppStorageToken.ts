export class AppStorageToken {
  constructor(readonly key: string) {}

  append(key: string): DataCompartmentToken {
    return new DataCompartmentToken(key, this);
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

  equals(val: DataCompartmentToken) {
    return this.value === val.value;
  }
}
