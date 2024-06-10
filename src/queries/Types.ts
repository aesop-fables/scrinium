import { Observable } from 'rxjs';

export interface IObservableQuery<Params, Response> {
  execute(params: Params): Observable<Response>;
}
