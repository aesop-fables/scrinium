import { IApplicationCacheManager } from './Caching';

export type ISystemClock = {
  now(): number;
};

export const systemClock: ISystemClock = {
  now() {
    return new Date().getTime();
  },
};

export type SystemOverrides = {
  cache?: IApplicationCacheManager;
  clock?: ISystemClock;
};
