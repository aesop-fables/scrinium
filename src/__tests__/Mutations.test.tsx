import 'reflect-metadata';
import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import {
  useProjection,
  useObservable,
  useMutation,
  DataCache,
  useAppStorage,
  MutationStatus,
  ProjectionContext,
  MutationContext,
  IMutation,
  injectProjectionContext,
} from '../index';
import { AccountCompartmentKey, AccountCompartments, AccountInfoRest, createAccountStorage } from './Common';
import { InteractionContext } from './InteractionContext';
import { combineLatest, firstValueFrom, map, Observable } from 'rxjs';
import { wait } from './utils';
import { waitUntil } from '../tasks';
import { ConfiguredDataSource } from '../Compartments';

interface AccountSummaryDto {
  id: number;
  name: string;
  nrInvestments: number;
  balance: number;
}

class AccountSummariesProjection {
  readonly cache: DataCache<AccountCompartments>;

  constructor(@injectProjectionContext() private readonly context: ProjectionContext) {
    const { storage } = this.context;
    this.cache = storage.retrieve<AccountCompartments>(AccountCompartmentKey);
  }

  get accounts$(): Observable<AccountSummaryDto[]> {
    return this.cache.observe$<AccountInfoRest[]>('plans').pipe(
      map((accounts) =>
        accounts.map((x) => ({
          id: x.id,
          name: x.title,
          nrInvestments: x.investments.length,
          balance: x.investments.map((_) => _.balance).reduce((a, b) => a + b, 0),
        })),
      ),
    );
  }
}

interface AccountsSummaryReport {
  totalNrAccounts: number;
  totalBalance: number;
}

class AccountsSummaryProjection {
  readonly inner: AccountSummariesProjection;

  constructor(@injectProjectionContext() private readonly context: ProjectionContext) {
    this.inner = new AccountSummariesProjection(context);
  }

  get report$(): Observable<AccountsSummaryReport> {
    return this.inner.accounts$.pipe(
      map((accounts) => ({
        totalNrAccounts: accounts.length,
        totalBalance: accounts.map((x) => x.balance).reduce((a, b) => a + b, 0),
      })),
    );
  }
}

let removeAccountApi: undefined | (() => Promise<void>);
// Make the component render a loading indicator against the accounts data cache
// Now, time to make the mutation
// removeAccount (triggered by a button)
// Verify each status / state transition in the state machine via the MutationStatus enum

export class RemoveAccount implements IMutation<AccountSummaryDto> {
  async execute(context: MutationContext<AccountSummaryDto>): Promise<void> {
    if (removeAccountApi) {
      await removeAccountApi();
    }

    const { data, storage } = context;
    const cache = storage.retrieve<AccountCompartments>(AccountCompartmentKey);
    await cache.modify<AccountInfoRest[]>('plans', async (accounts: AccountInfoRest[]) => {
      return accounts.filter((x) => x.id !== data.id);
    });
  }
}

const SampleDashboard: React.FC = () => {
  const appStorage = useAppStorage();
  const accountsCache = appStorage.retrieve<AccountCompartments>(AccountCompartmentKey);
  const { action: remove, status } = useMutation<AccountSummaryDto>(new RemoveAccount());
  const { accounts$ } = useProjection(AccountSummariesProjection);
  const { report$ } = useProjection(AccountsSummaryProjection);
  const [accounts, report, initialized] = useObservable(
    combineLatest([accounts$, report$, accountsCache.initialized$]),
  ) ?? [[], {}, false];

  if (!initialized || status === MutationStatus.Executing) {
    return <p>Loading...</p>;
  }

  return (
    <>
      <p>Accounts:</p>
      <div>
        {accounts.map((account) => (
          <div key={account.id}>
            <div>
              <p key={account.name}>{`${account.name} (${account.nrInvestments}): ${account.balance}`}</p>
            </div>
            <div>
              <button onClick={() => remove(account)} data-testid={`removeAccount-${account.id}`}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <div>
        <p>{`Total Accounts: ${report.totalNrAccounts}`}</p>
      </div>
      <div>
        <p>{`Total Balance: ${report.totalBalance}`}</p>
      </div>
    </>
  );
};

describe('Mutations', () => {
  beforeEach(() => {
    if (!removeAccountApi) {
      removeAccountApi = async () => {
        console.log('Removing account...');
      };
    }
  });

  afterEach(() => {
    removeAccountApi = undefined;
  });

  test('Initial rendering of data', async () => {
    const [appStorage, dataCache] = createAccountStorage({
      plans: {
        loadingOptions: {
          strategy: 'manual',
        },
        source: new ConfiguredDataSource(async () => [
          { id: 1, title: 'Account 1', investments: [{ id: 101, balance: 10, title: 'Account 1 - Investment 1' }] },
          { id: 2, title: 'Account 2', investments: [] },
          { id: 10, title: 'Account 3', investments: [] },
        ]),
        defaultValue: [],
      },
    });

    render(
      <InteractionContext appStorage={appStorage}>
        <SampleDashboard />
      </InteractionContext>,
    );

    await act(async () => await dataCache.reload('plans'));

    await waitFor(() => screen.getByText(/Account 1 \(1\): 10/i));
    await waitFor(() => screen.getByText(/Account 2 \(0\): 0/i));
    await waitFor(() => screen.getByText(/Account 3 \(0\): 0/i));
    await waitFor(() => screen.getByText(/Total Accounts: 3/i));
    await waitFor(() => screen.getByText(/Total Balance: 10/i));
  });

  test('Invoke the mutation - verify the loading indicator', async () => {
    removeAccountApi = async () => {
      await wait(5000); // cranking it up to avoid race conditions
    };

    const [appStorage, dataCache] = createAccountStorage({
      plans: {
        loadingOptions: {
          strategy: 'manual',
        },
        source: new ConfiguredDataSource(async () => [
          { id: 1, title: 'Account 1', investments: [{ id: 101, balance: 10, title: 'Account 1 - Investment 1' }] },
          { id: 2, title: 'Account 2', investments: [] },
          { id: 10, title: 'Account 3', investments: [] },
        ]),
        defaultValue: [],
      },
    });

    const isLoaded = async () => {
      const initialized = await firstValueFrom(dataCache.initialized$);
      return initialized;
    };

    render(
      <InteractionContext appStorage={appStorage}>
        <SampleDashboard />
      </InteractionContext>,
    );

    await act(async () => await dataCache.reload('plans'));
    await act(async () => {
      await waitFor(isLoaded);
    });

    fireEvent.click(screen.getByTestId('removeAccount-1'), {
      nativeEvent: {
        pageX: 20,
        pageY: 30,
      },
    });

    await waitFor(
      async () => {
        try {
          await screen.getByText(/Loading.../i);
          return true;
        } catch (e) {
          return false;
        }
      },
      { interval: 100, timeout: 2000 },
    );
  });

  test('Invoke the mutation - verify that the account is no longer displayed', async () => {
    const [appStorage, dataCache] = createAccountStorage({
      plans: {
        loadingOptions: {
          strategy: 'manual',
        },
        source: new ConfiguredDataSource(async () => [
          { id: 1, title: 'Account 1', investments: [{ id: 101, balance: 10, title: 'Account 1 - Investment 1' }] },
          { id: 2, title: 'Account 2', investments: [] },
          { id: 10, title: 'Account 3', investments: [] },
        ]),
        defaultValue: [],
      },
    });

    const isLoaded = async () => {
      const initialized = await firstValueFrom(dataCache.initialized$);
      return initialized;
    };

    render(
      <InteractionContext appStorage={appStorage}>
        <SampleDashboard />
      </InteractionContext>,
    );

    await act(async () => await dataCache.reload('plans'));
    await waitUntil(isLoaded);

    fireEvent.click(screen.getByTestId('removeAccount-1'), {
      nativeEvent: {
        pageX: 20,
        pageY: 30,
      },
    });

    await waitFor(
      async () => {
        try {
          await screen.getByText(/Loading.../i);
          return false;
        } catch (e) {
          return true;
        }
      },
      { interval: 100, timeout: 2000 },
    );

    await waitFor(() => screen.getByText(/Total Accounts: 2/i));
    await waitFor(() => screen.getByText(/Total Balance: 0/i));
  });
});
