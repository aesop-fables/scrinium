import { IAppStorage } from './AppStorage';
import { AppStorageToken, DataCompartmentToken, ScriniumToken } from './AppStorageToken';
import { IApplicationCacheManager } from './Caching';
import { ISystemClock } from './System';

export type TriggerConfiguration = {
  caches: AppStorageToken[];
  compartments: DataCompartmentToken[];
};

export class TriggerContext {
  constructor(
    readonly appCache: IApplicationCacheManager,
    readonly storage: IAppStorage,
    readonly clock: ISystemClock,
  ) {}
}

export interface IDataTrigger {
  tokens: ScriniumToken[];
  onReset(context: TriggerContext): void;
}

export class InvalidateDataTrigger implements IDataTrigger {
  constructor(readonly tokens: ScriniumToken[]) {}

  onReset(context: TriggerContext): void {
    // context.appCache.invalidate(this.key);
    console.log('Invalidating cache', context);
  }
}
