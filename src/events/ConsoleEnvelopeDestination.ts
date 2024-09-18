import { EventEnvelope } from './EventEnvelope';
import { IEventEnvelopeDestination } from './IEventEnvelopeDestination';

export class ConsoleEnvelopeDestination implements IEventEnvelopeDestination {
  async append(envelope: EventEnvelope): Promise<void> {
    console.log(envelope);
  }
}
