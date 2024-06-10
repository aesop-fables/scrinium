import { IServiceContainer, Newable, injectContainer } from '@aesop-fables/containr';
import { Observable } from 'rxjs';
import { IObservableQuery } from './Types';

export interface IObservableQueryDispatcher {
  dispatch<Params, Response>(
    constructor: Newable<IObservableQuery<Params, Response>>,
    params: Params,
  ): Observable<Response>;
}

export class ObservableQueryDispatcher implements IObservableQueryDispatcher {
  constructor(@injectContainer() private readonly container: IServiceContainer) {}

  dispatch<Params, Response>(
    constructor: Newable<IObservableQuery<Params, Response>>,
    params: Params,
  ): Observable<Response> {
    const operation = this.container.resolve<IObservableQuery<Params, Response>>(constructor);
    return operation.execute(params);
  }
}
