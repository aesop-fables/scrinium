export type EventEnvelope = {
  eventId: string;
  streamId: string;
  eventType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  timestamp: string;
};
