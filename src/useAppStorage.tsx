import { useService } from '@aesop-fables/containr-react';
import { IAppStorage } from './AppStorage';
import { DataCacheServices } from "./bootstrapping/DataCacheServices";

export function useAppStorage(): IAppStorage {
  return useService<IAppStorage>(DataCacheServices.AppStorage);
}
