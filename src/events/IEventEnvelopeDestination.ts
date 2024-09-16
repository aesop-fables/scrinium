import { EventEnvelope } from './EventEnvelope';

export interface IEventEnvelopeDestination {
  publish(envelope: EventEnvelope): Promise<void>;
}
