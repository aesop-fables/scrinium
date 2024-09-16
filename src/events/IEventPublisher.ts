export interface IEventPublisher {
  publish<Event>(streamId: string, eventType: string, event: Event): Promise<void>;
}
