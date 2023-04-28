import { BehaviorSubject, map, Observable } from 'rxjs';
import {
  IAppStorage,
  createDataCache,
  DataCache,
  DataCompartmentOptions,
  AppStorage,
  ProjectionContext,
  createDataCacheModule,
  IProjectionFactory,
  createProjection,
  RepositoryCompartmentOptions,
  fromProjection,
} from '../index';
import { ConfiguredDataSource } from '../Compartments';

export function createAccountDataCache(): DataCache<AccountCompartments> {
  return createDataCache<AccountCompartments>({
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

  constructor(context: ProjectionContext) {
    const { storage } = context;
    this.cache = storage.retrieve<AccountCompartments>(AccountCompartmentKey);
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

export class CurrentUserProjection implements IProjectionFactory<CurrentUser> {
  constructor(private readonly name: string) {}

  create(context: ProjectionContext): CurrentUser {
    const { container, storage } = context;
    return createProjection(storage, container, CurrentUser, this.name);
  }
}

export class CurrentUser {
  private readonly user = new BehaviorSubject('');

  constructor(_context: ProjectionContext, name: string) {
    this.user.next(name);
  }

  get user$(): Observable<string> {
    return this.user.pipe();
  }
}

export function createAccountStorage(policy: AccountCompartments): [IAppStorage, DataCache<AccountCompartments>] {
  const appStorage = new AppStorage();
  const dataCache = createDataCache<AccountCompartments>(policy);
  appStorage.store(AccountCompartmentKey, dataCache);

  return [appStorage, dataCache];
}

export const withInvestmentAccounts = createDataCacheModule((appStorage) => {
  const dataCache: DataCache<AccountCompartments> = createDataCache<AccountCompartments>({
    plans: {
      source: new ConfiguredDataSource(async () => []),
      defaultValue: [],
    },
  });

  appStorage.store<AccountCompartments>(CompartmentKeys.plans, dataCache);
});

export interface Video {
  id: string;
  title: string;
}

export interface VideoMetadata {
  id: string;
  duration: number;
}

// In this example, we're pretending that the data we need
// comes from two separate APIs that we need to merge together
export interface VideoRegistry {
  videos: RepositoryCompartmentOptions<string, Video>;
  metadata: RepositoryCompartmentOptions<string, VideoMetadata>;
}
