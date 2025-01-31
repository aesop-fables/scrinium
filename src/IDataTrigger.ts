import { IApplicationCacheManager } from './Caching';
import { EventEnvelope, EventType } from './DataCompartment';
import { DataStore } from './DataStore';
import { DataStoreToken } from './DataStoreToken';
import { ISystemClock } from './System';

export class TriggerContext {
  constructor(
    readonly appCache: IApplicationCacheManager,
    readonly envelope: EventEnvelope,
    readonly store: DataStore,
    readonly clock: ISystemClock,
  ) {}
}

export interface IDataTrigger {
  tokens: DataStoreToken[];
  onCompartmentEventRaised(context: TriggerContext): void;
}

export class InvalidateDataTrigger implements IDataTrigger {
  private readonly eventTypes: EventType[] = ['change', 'reset'];
  constructor(readonly tokens: DataStoreToken[]) {}

  onCompartmentEventRaised(context: TriggerContext): void {
    if (this.eventTypes.indexOf(context.envelope.type) === -1) return;

    this.tokens.forEach((token) => {
      context.appCache.invalidate(token.value);
    });
  }
}

export class ResetDataTrigger implements IDataTrigger {
  constructor(readonly tokens: DataStoreToken[]) {}

  onCompartmentEventRaised(context: TriggerContext): void {
    if (context.envelope.type !== 'reset') return;

    this.tokens.forEach((token) => {
      context.store.reset(token);
    });
  }
}
