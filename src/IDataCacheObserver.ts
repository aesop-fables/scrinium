import { IDataCompartment } from './Compartments';

export interface IDataCacheObserver {
  observe(compartments: IDataCompartment[]): void;
}
