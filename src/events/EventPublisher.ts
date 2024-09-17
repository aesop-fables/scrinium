import { EventEnvelope } from './EventEnvelope';
import { IEventEnvelopeDestination } from './IEventEnvelopeDestination';
import { EnvelopeProducer, IEnvelopeProducer } from './IEnvelopeProducer';
import { RollingArray } from './RollingArray';

export type EventOptions = {
  destinations?: IEventEnvelopeDestination[];
  producer?: IEnvelopeProducer;
  storageLimit: number;
};

export class EventConfiguration {
  private static _options: EventOptions = {
    storageLimit: 1000,
    destinations: [],
  };

  static configure(options: EventOptions) {
    this._options = options;
  }

  static createEventStore(): EventStore {
    return new EventStore(this._options.storageLimit);
  }

  static createEventPublisher(): EventPublisher {
    const producer = this._options.producer ?? new EnvelopeProducer();
    return new EventPublisher(producer, this._options.destinations ?? []);
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

  getStream(): EventEnvelope[] {
    return this.events.values;
  }

  findByStreamId(streamId: string): EventEnvelope[] {
    const events = this.events.values;
    return events.filter((x) => x.streamId === streamId);
  }

  static _instance?: EventStore;

  static get instance(): EventStore {
    if (!EventStore._instance) {
      EventStore._instance = EventConfiguration.createEventStore();
    }

    return EventStore._instance;
  }
}

export class EventPublisher {
  constructor(
    private readonly producer: IEnvelopeProducer,
    private readonly destinations: IEventEnvelopeDestination[],
  ) {}

  async publish<Event>(streamId: string, eventType: string, event: Event): Promise<void> {
    const envelope = await this.producer.createEnvelope(streamId, eventType, event);
    await Promise.all(this.destinations.map((x) => x.append(envelope)));
  }

  static _instance?: EventPublisher;

  static get instance(): EventPublisher {
    if (!EventPublisher._instance) {
      EventPublisher._instance = EventConfiguration.createEventPublisher();
    }

    return EventPublisher._instance;
  }
}
