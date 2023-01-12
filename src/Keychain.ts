function now(): number {
  return new Date().getTime();
}

export class Key {
  readonly expirationTimestamp?: number;
  constructor(expiration?: number) {
    const timestamp = now();
    this.expirationTimestamp = expiration ? timestamp + expiration : undefined;
  }

  expiration(): number | undefined {
    return this.expirationTimestamp;
  }

  get isExpired(): boolean {
    if (!this.expirationTimestamp) {
      return false;
    }

    const diff = this.expirationTimestamp - now();
    return diff <= 0;
  }
}

export class Keychain {
  readonly keys: Record<string, Key> = {};

  register(key: string, expiresIn?: number): void {
    this.keys[key] = new Key(expiresIn);
  }

  find(key: string): Key {
    return this.keys[key];
  }
}
