import { Subscription } from 'rxjs';

/**
 * Provides a mechanism for composing services through observable subscriptions.
 *
 * @example
 * class SampleListener implements IListener, Partial<Observer<boolean>> {
 *   constructor(private readonly isAuthenticated$: Observable<boolean>, private readonly authentication: IAuthenticationService) {}
 *   start(): Subscription {
 *     return this.isAuthenticated$.subscribe(this);
 *   }
 *   stop(): void {
 *     // this method is optional and will be invoked AFTER the subscription is removed
 *   }
 *   next(isAuthenticated: boolean): void {
 *     if (!isAuthenticated) {
 *       this.authentication.signOut();
 *     }
 *   }
 * }
 */
export interface IListener {
  start(): Subscription;
  stop?: () => void;
}
