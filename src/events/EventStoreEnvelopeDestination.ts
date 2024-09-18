import { EventEnvelope } from './EventEnvelope';
import { EventStore } from './EventPublisher';
import { IEventEnvelopeDestination } from './IEventEnvelopeDestination';

export class EventStoreEnvelopeDestination implements IEventEnvelopeDestination {
  async append(envelope: EventEnvelope): Promise<void> {
    EventStore.instance.append(envelope);
  }
}
