import { IApplicationCacheManager } from './Caching';
import { DataStore } from './DataStore';
import { DataStoreToken } from './DataStoreToken';
import { ISystemClock } from './System';

export class TriggerContext {
  constructor(
    readonly appCache: IApplicationCacheManager,
    readonly store: DataStore,
    readonly clock: ISystemClock,
    // Probably going to need to the containr...if not, then at least the subject resolver
  ) {}
}

export interface IDataTrigger {
  tokens: DataStoreToken[];
  onReset(context: TriggerContext): void;
}

export class InvalidateDataTrigger implements IDataTrigger {
  constructor(readonly tokens: DataStoreToken[]) {}

  onReset(context: TriggerContext): void {
    console.log('Invalidating tokens', this.tokens);
    console.log(context);
  }
}
