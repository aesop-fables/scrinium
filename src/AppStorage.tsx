import React, { createContext, useContext } from 'react';
import { DataCache, IDataCache } from './DataCache';
import { IRepository } from './Repository';

export interface IAppStorage {
  repository<Policy>(key: string): IRepository<Policy>;
  retrieve<Policy>(key: string): DataCache<Policy>;
  store<Policy>(key: string, value: DataCache<Policy> | IRepository<Policy>): void;
}

export class AppStorage implements IAppStorage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private values: Record<string, any> = {};

  repository<Policy>(key: string): IRepository<Policy> {
    return this.values[key] as IRepository<Policy>;
  }

  retrieve<Policy>(key: string): DataCache<Policy> {
    return this.values[key] as DataCache<Policy>;
  }

  store<Policy>(key: string, value: DataCache<Policy> | IRepository<Policy>): void {
    this.values[key] = value;
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
