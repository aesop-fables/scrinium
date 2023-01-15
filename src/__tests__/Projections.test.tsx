import 'reflect-metadata';
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { useProjection, useObservable } from '../index';
import {
  AccountProjections,
  AccountSummaryProjection,
  createAccountStorage,
  CurrentUser,
  CurrentUserProjection,
} from './Common';
import { InteractionContext } from './InteractionContext';
import { combineLatest } from 'rxjs';
import { ConfiguredDataSource } from '../Compartments';

const SampleComponent: React.FC = () => {
  const { accounts$ } = useProjection(AccountProjections);
  const { totalBalance$ } = useProjection(AccountSummaryProjection);
  const { user$ } = useProjection<CurrentUser>(new CurrentUserProjection('Josh'));
  const [accounts, totalBalance, user] = useObservable(combineLatest([accounts$, totalBalance$, user$])) ?? [[], 0, ''];

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
    </>
  );
};

describe('Sample Component', () => {
  test('Initial rendering of accounts', async () => {
    const [appStorage, dataCache] = createAccountStorage({
      plans: {
        autoLoad: false,
        source: new ConfiguredDataSource(async () => [
          { id: 1, title: 'Account 1', investments: [] },
          { id: 2, title: 'Account 2', investments: [{ id: 1, title: 'My First Investment', balance: 150 }] },
          { id: 10, title: 'Account 3', investments: [] },
        ]),
        defaultValue: [],
      },
    });

    render(
      <InteractionContext appStorage={appStorage}>
        <SampleComponent />
      </InteractionContext>,
    );

    await act(async () => await dataCache.reload('plans'));

    await waitFor(() => screen.getByText(/Hello, Josh/i));

    await waitFor(() => screen.getByText(/Account 1/i));
    await waitFor(() => screen.getByText(/Account 2/i));
    await waitFor(() => screen.getByText(/Account 3/i));

    await waitFor(() => screen.getByText(/Balance: 150/i));
  });
});
