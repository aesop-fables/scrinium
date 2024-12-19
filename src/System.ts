export type ISystemClock = {
  now(): number;
};

export const systemClock: ISystemClock = {
  now() {
    return Date.now();
  },
};

export type SystemOverrides = {
  clock?: ISystemClock;
};
