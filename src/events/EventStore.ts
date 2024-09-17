import { EventEnvelope } from './EventEnvelope';
import { IEventEnvelopeDestination } from './IEventEnvelopeDestination';
import { RollingArray } from './RollingArray';

export type EventStoreOptions = {
  limit: number;
};

export class EventStoreConfiguration {
  private static _options: EventStoreOptions = {
    limit: 1000,
  };

  static configure(options: EventStoreOptions) {
    this._options = options;
  }

  static createEventStore(): EventStore {
    return new EventStore(this._options.limit);
  }
}

export class EventStore implements IEventEnvelopeDestination {
  private readonly events: RollingArray<EventEnvelope>;

  constructor(limit: number) {
    this.events = new RollingArray(limit);
  }

  async append(envelope: EventEnvelope): Promise<void> {
    this.events.add(envelope);
  }

  findByStreamId(streamId: string): EventEnvelope[] {
    const events = this.events.values;
    return events.filter((x) => x.streamId === streamId);
  }

  static _instance?: EventStore;

  static get instance(): EventStore {
    if (!EventStore._instance) {
      EventStore._instance = EventStoreConfiguration.createEventStore();
    }

    return EventStore._instance;
  }
}
