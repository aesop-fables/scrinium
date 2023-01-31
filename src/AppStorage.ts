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


