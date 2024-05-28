/* eslint-disable @typescript-eslint/no-explicit-any */
import { firstValueFrom, mergeMap, Observable } from 'rxjs';
import { DataCompartmentOptions, IDataCompartment } from './Compartments';
import { DataCacheHash } from './DataCacheHash';
import { ISubject } from './ISubject';
import { IAppStorage } from './AppStorage';
import { ScriniumServices } from './ScriniumServices';
import { inject } from '@aesop-fables/containr';

export interface DataCompartmentState {
  key: string;
  options: DataCompartmentOptions<any>;
  hash: string;
  initialized: boolean;
  hasError: boolean;
  error?: unknown;
}

export interface IApplicationState {
  compartments: DataCompartmentState[];
}

export class ApplicationState implements ISubject<IApplicationState> {
  constructor(@inject(ScriniumServices.AppStorage) private readonly appStorage: IAppStorage) {}

  createObservable(): Observable<IApplicationState> {
    return this.appStorage.state$.pipe(
      mergeMap(async (state) => {
        const mappedCompartments: DataCompartmentState[] = [];
        for (let i = 0; i < state.dataCaches.length; i++) {
          const cache = state.dataCaches[i];
          const hash = DataCacheHash.from(cache);
          const compartments: IDataCompartment[] = [];
          cache.observeWith({
            observe(c) {
              compartments.push(...c);
            },
          });

          for (let j = 0; j < compartments.length; j++) {
            const compartment = compartments[j];
            let hasError = false;
            let error: unknown | undefined;
            let initialized = false;

            try {
              initialized = await firstValueFrom(compartment.initialized$());
            } catch (e) {
              hasError = true;
              error = e;
            }

            mappedCompartments.push({
              key: compartment.key,
              hasError,
              hash,
              initialized,
              options: compartment.options,
              error,
            });
          }
        }

        return {
          compartments: mappedCompartments,
        };
      }),
    );
  }
}
