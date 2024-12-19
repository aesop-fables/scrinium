/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataCompartmentOptions } from './Compartments';

export interface DataCompartmentState {
  key: string;
  options: DataCompartmentOptions<any>;
  lastLoaded: number;
  value?: any;
  initialized: boolean;
  loading: boolean;
  error?: unknown;
}
