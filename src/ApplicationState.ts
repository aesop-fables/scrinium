/* eslint-disable @typescript-eslint/no-explicit-any */
import { map, Observable } from 'rxjs';
import { ISubject } from './ISubject';
import { ScriniumServices } from './ScriniumServices';
import { inject } from '@aesop-fables/containr';
import { DataCompartmentState } from './Compartments';
import { DataStore } from './DataStore';

export interface ApplicationCompartmentState extends DataCompartmentState {
  storageKey: string;
}

export interface IApplicationState {
  compartments: ApplicationCompartmentState[];
}

export class ApplicationState implements ISubject<IApplicationState> {
  constructor(@inject(ScriniumServices.DataStore) private readonly dataStore: DataStore) {}

  createObservable(): Observable<IApplicationState> {
    return this.dataStore.state$.pipe(
      map((state) => {
        const compartments: ApplicationCompartmentState[] = [];
        for (let i = 0; i < state.dataCaches.length; i++) {
          const dataCache = state.dataCaches[i];
          compartments.push(
            ...dataCache.compartments.map((compartment) => ({
              ...compartment.getCompartmentState(),
              storageKey: dataCache.token.key,
            })),
          );
        }

        return {
          compartments,
        };
      }),
    );
  }
}
