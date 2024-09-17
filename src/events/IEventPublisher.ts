export interface IEventPublisher {
  publish<Event>(eventType: string, event: Event): Promise<void>;
}
