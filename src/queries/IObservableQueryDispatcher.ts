import { IServiceContainer, Newable, injectContainer } from '@aesop-fables/containr';
import { firstValueFrom, Observable } from 'rxjs';
import { IObservableQuery } from './Types';

export interface IObservableQueryDispatcher {
  dispatch<Params, Response>(
    constructor: Newable<IObservableQuery<Params, Response>>,
    params: Params,
  ): Observable<Response>;

  execute<Params, Response>(
    constructor: Newable<IObservableQuery<Params, Response>>,
    params: Params,
  ): Promise<Response>;
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

  async execute<Params, Response>(
    constructor: Newable<IObservableQuery<Params, Response>>,
    params: Params,
  ): Promise<Response> {
    return await firstValueFrom(this.dispatch(constructor, params));
  }
}
