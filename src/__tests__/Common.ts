/* eslint-disable @typescript-eslint/ban-types */
import { map, Observable } from 'rxjs';
import {
  createDataCache,
  DataCache,
  DataCompartmentOptions,
  ProjectionContext,
  DataCacheScenario,
  createDataCacheScenario,
  fromProjection,
  injectProjectionContext,
  DataCatalog,
  DataCatalogModule,
  DataCacheRegistry,
} from '..';
import { ConfiguredDataSource } from '../ConfiguredDataSource';
import { DataStoreToken } from '../DataStoreToken';
import { IServiceModule, ServiceModule } from '@aesop-fables/containr';

export const TestTokens = {
  account: new DataStoreToken('accounts'),
  cache: new DataStoreToken('cache1'),
};

export function createAccountDataCache(): DataCache<AccountCompartments> {
  return createDataCache<AccountCompartments>(TestTokens.account, {
    plans: {
      source: new ConfiguredDataSource(async () => []),
      defaultValue: [],
    },
  });
}

export interface InvestmentInfoRest {
  id: number;
  title: string;
  balance: number;
}

export interface InvestmentInfo {
  id: number;
  name: string;
  balance: number;
}

export interface AccountInfoRest {
  id: number;
  title: string;
  investments: InvestmentInfoRest[];
}

export interface AccountInfo {
  id: number;
  name: string;
  investments: InvestmentInfo[];
}

export interface AccountCompartments {
  plans: DataCompartmentOptions<AccountInfoRest[]>;
}

export const CompartmentKeys = {
  plans: 'plans' as keyof AccountCompartments,
};

export function mapInvestmentInfoRestToInvestmentInfo(data: InvestmentInfoRest): InvestmentInfo {
  return {
    id: data.id,
    name: data.title,
    balance: data.balance,
  };
}

export function mapAccountInfoRestToAccountInfo(data: AccountInfoRest): AccountInfo {
  return {
    id: data.id,
    name: data.title,
    investments: data.investments.map(mapInvestmentInfoRestToInvestmentInfo),
  };
}

export const AccountCompartmentKey = 'test-accounts';

export class AccountProjections {
  readonly cache: DataCache<AccountCompartments>;

  constructor(@injectProjectionContext() context: ProjectionContext) {
    const { storage } = context;
    this.cache = storage.cache<AccountCompartments>(TestTokens.account);
  }

  get accounts$(): Observable<AccountInfo[]> {
    return this.cache
      .observe$<AccountInfoRest[]>('plans')
      .pipe(map((accounts) => accounts.map(mapAccountInfoRestToAccountInfo)));
  }
}

export class AccountSummaryProjection {
  constructor(@fromProjection(AccountProjections) private readonly accounts: AccountProjections) {}

  get totalBalance$(): Observable<number> {
    return this.accounts.accounts$.pipe(
      map((accounts) => {
        let balance = 0;
        accounts.forEach((account) => {
          account.investments.forEach((investment) => {
            balance += investment.balance;
          });
        });

        return balance;
      }),
    );
  }
}

export function createAccountStorage(policy: AccountCompartments): [DataCatalog, DataCache<AccountCompartments>] {
  const dataCatalog = new DataCatalog();
  const dataCache = createDataCache<AccountCompartments>(TestTokens.account, policy);
  dataCatalog.registerCache(dataCache);

  return [dataCatalog, dataCache];
}

export function createOperationScenario(): DataCacheScenario<AccountCompartments> & { accounts: AccountInfoRest[] } {
  const accounts: AccountInfoRest[] = [{ id: 1, title: 'Title', investments: [] }];
  return {
    ...createDataCacheScenario<AccountCompartments>(TestTokens.account, {
      plans: {
        source: new ConfiguredDataSource(async () => accounts),
        loadingOptions: {
          strategy: 'auto',
        },
        defaultValue: [],
      },
    }),
    accounts,
  };
}

export function useDataCache(modules: DataCatalogModule[] = []): IServiceModule {
  return new ServiceModule('dataCache', (services) => {
    services.include(new DataCacheRegistry({ modules }));
  });
}
