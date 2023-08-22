import { Subscription } from 'rxjs';

export interface IListener {
  start(): Subscription;
  stop?: () => void;
}
