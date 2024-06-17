/* eslint-disable @typescript-eslint/no-explicit-any */
import { map, Observable } from 'rxjs';
import { ISubject } from './ISubject';
import { IAppStorage } from './AppStorage';
import { ScriniumServices } from './ScriniumServices';
import { inject } from '@aesop-fables/containr';
import { DataCompartmentState } from './DataCompartmentState';

export interface ApplicationCompartmentState extends DataCompartmentState {
  storageKey: string;
}

export interface IApplicationState {
  compartments: ApplicationCompartmentState[];
}

export class ApplicationState implements ISubject<IApplicationState> {
  constructor(@inject(ScriniumServices.AppStorage) private readonly appStorage: IAppStorage) {}

  createObservable(): Observable<IApplicationState> {
    return this.appStorage.state$.pipe(
      map((state) => {
        const compartments: ApplicationCompartmentState[] = [];
        for (let i = 0; i < state.dataCaches.length; i++) {
          const { storageKey, dataCache } = state.dataCaches[i];
          compartments.push(
            ...dataCache.compartments.map((compartment) => ({
              ...compartment.getCompartmentState(),
              storageKey,
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
