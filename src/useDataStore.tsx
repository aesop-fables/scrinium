import { useService } from '@aesop-fables/containr-react';
import { DataStore } from './DataStore';
import { ScriniumServices } from './ScriniumServices';

export function useDataStore(): DataStore {
  return useService<DataStore>(ScriniumServices.DataStore);
}
