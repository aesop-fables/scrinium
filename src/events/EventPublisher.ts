import { IEventEnvelopeDestination } from './IEventEnvelopeDestination';
import { IEnvelopeProducer } from './IEventEnvelopeProducer';
import { IEventPublisher } from './IEventPublisher';

export class EventPublisher implements IEventPublisher {
  constructor(
    private readonly producer: IEnvelopeProducer,
    private readonly destinations: IEventEnvelopeDestination[],
  ) {}

  async publish<Event>(streamId: string, eventType: string, event: Event): Promise<void> {
    const envelope = await this.producer.createEnvelope(streamId, eventType, event);
    await Promise.all(this.destinations.map((x) => x.publish(envelope)));
  }
}
