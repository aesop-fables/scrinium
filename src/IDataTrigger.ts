import { IApplicationCacheManager } from './Caching';
import { EventEnvelope } from './DataCompartment';
import { DataStore } from './DataStore';
import { DataStoreToken } from './DataStoreToken';
import { ISystemClock } from './System';

export class TriggerContext {
  constructor(
    readonly appCache: IApplicationCacheManager,
    readonly envelope: EventEnvelope,
    readonly store: DataStore,
    readonly clock: ISystemClock,
    // Probably going to need to the containr...if not, then at least the subject resolver
  ) {}
}

export interface IDataTrigger {
  tokens: DataStoreToken[];
  onCompartmentEventRaised(context: TriggerContext): void;
}

export class InvalidateDataTrigger implements IDataTrigger {
  constructor(readonly tokens: DataStoreToken[]) {}

  onCompartmentEventRaised(context: TriggerContext): void {
    this.tokens.forEach((token) => {
      context.appCache.invalidate(token.value);

      // need a way to dynamically construct a path from a token
      // const path = DataCatalogPath.fromCacheCompartment(token);
    });
  }
}
