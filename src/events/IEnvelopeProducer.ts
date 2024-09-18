import { EventEnvelope } from './EventEnvelope';

export interface IEnvelopeProducer {
  createEnvelope<Event>(streamId: string, eventType: string, event: Event): Promise<EventEnvelope>;
}

export class EnvelopeProducer implements IEnvelopeProducer {
  async createEnvelope<Event>(streamId: string, eventType: string, event: Event): Promise<EventEnvelope> {
    return {
      eventId: new Date().getTime().toString(),
      streamId,
      eventType,
      data: event,
      timestamp: new Date().toISOString(),
    };
  }
}
