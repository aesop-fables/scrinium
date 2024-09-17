import { IEventEnvelopeDestination } from './IEventEnvelopeDestination';
import { IEnvelopeProducer } from './IEventEnvelopeProducer';
import { IEventPublisher } from './IEventPublisher';

export class ConfiguredEventPublisher implements IEventPublisher {
  constructor(
    private readonly streamId: string,
    private readonly producer: IEnvelopeProducer,
    private readonly destinations: IEventEnvelopeDestination[],
  ) {}

  async publish<Event>(eventType: string, event: Event): Promise<void> {
    const envelope = await this.producer.createEnvelope(this.streamId, eventType, event);
    await Promise.all(this.destinations.map((x) => x.append(envelope)));
  }
}
