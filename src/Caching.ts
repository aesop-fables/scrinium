import { ISystemClock } from './System';

export class AppStorageCacheToken {
  constructor(
    readonly key: string,
    readonly expirationTimestamp?: number,
  ) {}

  isExpired(clock: ISystemClock): boolean {
    if (!this.expirationTimestamp) {
      return false;
    }

    const diff = this.expirationTimestamp - clock.now();
    return diff <= 0;
  }
}

export interface IApplicationCacheManager {
  register(key: string, expiresIn?: number): void;
  find(key: string): AppStorageCacheToken | undefined;
  invalidate(key: string): void;
}

export class ApplicationCacheManager {
  public static readonly instance = new ApplicationCacheManager();

  readonly tokens: Record<string, AppStorageCacheToken> = {};

  register(key: string, expiresIn?: number): void {
    this.tokens[key] = new AppStorageCacheToken(key, expiresIn);
  }

  find(key: string): AppStorageCacheToken | undefined {
    return this.tokens[key];
  }

  invalidate(key: string) {
    this.tokens[key] = new AppStorageCacheToken(key, new Date().getTime() - 1);
  }
}
