import React, { createContext, useContext } from 'react';
import { DataCache, IDataCache } from './DataCache';

export interface IAppStorage {
  retrieve<Policy>(key: string): DataCache<Policy>;
  store<Policy>(key: string, dataCache: DataCache<Policy>): void;
}

export class AppStorage implements IAppStorage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private values: Record<string, any> = {};

  retrieve<Policy>(key: string): DataCache<Policy> {
    return this.values[key] as DataCache<Policy>;
  }

  store(key: string, cache: IDataCache): void {
    this.values[key] = cache;
  }
}

const AppStorageContext = createContext<IAppStorage | undefined>(undefined);

export interface AppStorageProviderProps {
  storage: IAppStorage;
  children: JSX.Element;
}

export const AppStorageProvider: React.FC<AppStorageProviderProps> = ({ children, storage }) => {
  return <AppStorageContext.Provider value={storage}>{children}</AppStorageContext.Provider>;
};

export function useAppStorage(): IAppStorage {
  const storage = useContext(AppStorageContext);
  if (!storage) {
    throw new Error('useAppStorage must be used within an AppStorageProvider.');
  }

  return storage;
}
