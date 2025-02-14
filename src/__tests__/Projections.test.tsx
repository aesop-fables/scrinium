import 'reflect-metadata';
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import {
  useProjection,
  useObservable,
  useRepositoryProjection,
  createRepository,
  ConfiguredEntityResolver,
  DataStore,
} from '../index';
import {
  AccountProjections,
  AccountSummaryProjection,
  createAccountStorage,
  CurrentUser,
  CurrentUserProjection,
  VideoRegistry,
  Video,
} from './Common';
import { InteractionContext } from './InteractionContext';
import { combineLatest } from 'rxjs';
import { ConfiguredDataSource } from '../ConfiguredDataSource';
import { DataStoreToken } from '../DataStoreToken';

const repoToken = new DataStoreToken('videos');

function useVideoRepositoryProjection(id: string) {
  return useRepositoryProjection<VideoRegistry, Video>('videos', 'videos', id);
}

const SampleComponent: React.FC = () => {
  const { accounts$ } = useProjection(AccountProjections);
  const { totalBalance$ } = useProjection(AccountSummaryProjection);
  const { user$ } = useProjection<CurrentUser>(new CurrentUserProjection('Josh'));
  const { loading$, value$ } = useVideoRepositoryProjection('1');
  const [accounts, totalBalance, user, loading, video] = useObservable(
    combineLatest([accounts$, totalBalance$, user$, loading$, value$]),
  ) ?? [[], 0, '', true, { title: '' }];

  return (
    <>
      <h1>Hello, {user}!</h1>
      <p>Here is a summary of your accounts:</p>
      <div>
        {accounts.map((account) => (
          <p key={account.name}>{account.name}</p>
        ))}
      </div>
      <div>
        <span id="balance">Balance: {totalBalance}</span>
      </div>
      <div>
        <h3>And for your viewing pleasure...</h3>
        {loading ? <p>loading...</p> : <p>Here is video {video.title}</p>}
      </div>
    </>
  );
};

describe('Sample Component', () => {
  test('Initial rendering of accounts', async () => {
    const [dataCatalog, dataCache] = createAccountStorage({
      plans: {
        loadingOptions: {
          strategy: 'manual',
        },
        source: new ConfiguredDataSource(async () => [
          { id: 1, title: 'Account 1', investments: [] },
          { id: 2, title: 'Account 2', investments: [{ id: 1, title: 'My First Investment', balance: 150 }] },
          { id: 10, title: 'Account 3', investments: [] },
        ]),
        defaultValue: [],
      },
    });

    const repository = createRepository<VideoRegistry>(repoToken, {
      videos: {
        resolver: new ConfiguredEntityResolver(async (id) => ({ id, title: 'Hello' })),
      },
      metadata: {
        resolver: new ConfiguredEntityResolver(async (id) => ({ id, duration: 500 })),
      },
    });

    dataCatalog.registerRepository(repository);

    render(
      <InteractionContext dataStore={new DataStore(dataCatalog)}>
        <SampleComponent />
      </InteractionContext>,
    );

    await act(async () => await dataCache.reload('plans'));

    await waitFor(() => screen.getByText(/Hello, Josh/i));

    await waitFor(() => screen.getByText(/Account 1/i));
    await waitFor(() => screen.getByText(/Account 2/i));
    await waitFor(() => screen.getByText(/Account 3/i));

    await waitFor(() => screen.getByText(/Balance: 150/i));

    await waitFor(() => screen.getByText(/Here is video Hello/i));
  });
});
