import { useService } from '@aesop-fables/containr-react';
import { IAppStorage } from './AppStorage';
import { ScriniumServices } from './ScriniumServices';

export function useAppStorage(): IAppStorage {
  return useService<IAppStorage>(ScriniumServices.AppStorage);
}
