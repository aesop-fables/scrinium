import { IApplicationCacheManager } from './Caching';
import { ChangeRecord } from './Compartments';
import { DataStore } from './DataStore';
import { DataStoreToken } from './DataStoreToken';
import { ISystemClock } from './System';

export class TriggerContext {
  constructor(
    readonly appCache: IApplicationCacheManager,
    readonly record: ChangeRecord,
    readonly store: DataStore,
    readonly clock: ISystemClock,
    // Probably going to need to the containr...if not, then at least the subject resolver
  ) {}
}

export interface IDataTrigger {
  tokens: DataStoreToken[];
  onCompartmentChanged(context: TriggerContext): void;
}

export class InvalidateDataTrigger implements IDataTrigger {
  constructor(readonly tokens: DataStoreToken[]) {}

  onCompartmentChanged(context: TriggerContext): void {
    this.tokens.forEach((token) => {
      context.appCache.invalidate(token.value);
    });
  }
}
