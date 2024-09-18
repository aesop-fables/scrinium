import { EventEnvelope } from './EventEnvelope';

export interface IEventEnvelopeDestination {
  append(envelope: EventEnvelope): Promise<void>;
}
