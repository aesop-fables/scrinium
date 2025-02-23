import 'reflect-metadata';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DataCatalog, DataStore, ISubject, useSubject } from '../index';
import { InteractionContext } from './InteractionContext';
import { Observable, of } from 'rxjs';
import { ServiceCollection, inject } from '@aesop-fables/containr';

interface User {
  firstName: string;
  product: string;
}

interface IUserFactory {
  create(): User;
}

const userFactoryKey = 'userFactory';

class CurrentUser implements ISubject<User> {
  constructor(@inject(userFactoryKey) private readonly factory: IUserFactory) {}

  createObservable(): Observable<User> {
    return of(this.factory.create());
  }
}

const SampleComponent: React.FC = () => {
  const user = useSubject<User>(CurrentUser) ?? { firstName: '', product: '' };

  return (
    <>
      <h1>Hello, {user.firstName}!</h1>
      <p>You've been upgraded to {user.product}</p>
    </>
  );
};

describe('useSubject', () => {
  test('Render the user', async () => {
    const configureServices = (services: ServiceCollection) => {
      services.singleton<IUserFactory>(userFactoryKey, {
        create() {
          return { firstName: 'Josh', product: 'Platinum' };
        },
      });
    };

    const dataStore = new DataStore(new DataCatalog());
    render(
      <InteractionContext dataStore={dataStore} configureServices={configureServices}>
        <SampleComponent />
      </InteractionContext>,
    );

    await waitFor(() => screen.getByText(/Hello, Josh/i));
    await waitFor(() => screen.getByText(/upgraded to Platinum/i));
  });
});
