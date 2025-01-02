import 'reflect-metadata';
import React, { useMemo } from 'react';
import { Observable, map } from 'rxjs';
import { render, screen } from '@testing-library/react';
import { ServiceProvider } from '@aesop-fables/containr-react';
import { Scopes, createContainer, createServiceModule } from '@aesop-fables/containr';
import { useObservableQuery } from '../hooks/useObservableQuery';
import { IObservableQuery } from '../queries/Types';
import {
  AppStorageRegistrations,
  createAppStorageRegistrations,
  createDataCacheModule,
  IAppStorageRegistration,
  useScrinium,
} from '../bootstrapping';
import { DataCache, createDataCache } from '../DataCache';
import { DataCompartmentOptions } from '../Compartments';
import { ConfiguredDataSource } from '../ConfiguredDataSource';
import { Predicate, predicate } from '../Predicate';
import { injectDataCache } from '../Decorators';
import { ISubject, injectSubject } from '../ISubject';
import { wait } from './utils';
import { AppStorageToken } from '../AppStorageToken';

const predicateKey = 'predicateSubject';
const subjectKey = 'subjectKey';

describe('useObservableQuery', () => {
  test('Updates to params should change the observable', async () => {
    const observableServices = createServiceModule('test', (services) => {
      services.autoResolve(predicateKey, AccountLoadedPredicate, Scopes.Singleton);
      services.autoResolve(subjectKey, PreferencesSubject, Scopes.Singleton);
    });
    const container = createContainer([
      useScrinium({
        modules: [withAccountData, withPreferencesData],
      }),
      observableServices,
    ]);

    const { getByTestId } = render(
      <ServiceProvider rootContainer={container}>
        <Controller preferenceKey="foo" />
      </ServiceProvider>,
    );

    expect(await screen.findByTestId('loading')).toBeDefined();

    await wait(100);

    expect(getByTestId('controller').textContent).toBe('foo = bar');
  });
});

const Controller: React.FC<{ preferenceKey: string }> = ({ preferenceKey }) => {
  const preference = useObservableQuery(FindPreferenceByKey, { key: preferenceKey });
  const loading = useMemo(() => typeof preference === 'undefined', [preference]);
  return (
    <>
      {loading && <p data-testid="loading">Loading</p>}
      <div data-testid="controller">
        {preference?.key} = {preference?.value}
      </div>
    </>
  );
};

type FindPreferenceParams = {
  key: string;
};

class FindPreferenceByKey implements IObservableQuery<FindPreferenceParams, Preference | undefined> {
  constructor(@injectSubject(subjectKey) private readonly preferences$: Observable<Preference[]>) {}

  execute(params: Preference): Observable<Preference | undefined> {
    return this.preferences$.pipe(
      map((preferences) => {
        return preferences.find((x) => x.key === params.key);
      }),
    );
  }
}

interface AccountDto {
  username: string;
  firstName: string;
  lastName: string;
}

interface Preference {
  key: string;
  value?: string;
}

const accountsKey = new AppStorageToken('accounts');

interface AccountCompartments {
  account: DataCompartmentOptions<AccountDto | undefined>;
}

const preferencesKey = new AppStorageToken('preferences');

interface PreferenceCompartments {
  preferences: DataCompartmentOptions<Preference[]>;
}

class AccountLoadedPredicate implements Predicate {
  constructor(@injectDataCache(accountsKey.key) private readonly cache: DataCache<AccountCompartments>) {}

  createObservable(): Observable<boolean> {
    return this.cache.initialized$;
  }
}

@predicate(predicateKey)
class PreferencesSubject implements ISubject<Preference[]> {
  constructor(@injectDataCache(preferencesKey.key) private readonly cache: DataCache<PreferenceCompartments>) {}

  createObservable() {
    return this.cache.observe$<Preference[]>('preferences');
  }
}

class AccountRegistration implements IAppStorageRegistration {
  defineData(): AppStorageRegistrations {
    const cache = createDataCache<AccountCompartments>(accountsKey, {
      account: {
        loadingOptions: { strategy: 'lazy' },
        defaultValue: undefined,
        source: new ConfiguredDataSource(async () => {
          return {
            username: 'tuser',
            firstName: 'Test',
            lastName: 'User',
          };
        }),
      },
    });

    return {
      caches: [cache],
    };
  }
}

const withAccountData = createAppStorageRegistrations(AccountRegistration);

const withPreferencesData = createDataCacheModule((storage) => {
  const cache = createDataCache<PreferenceCompartments>(preferencesKey, {
    preferences: {
      loadingOptions: {
        strategy: 'auto',
      },
      defaultValue: [],
      source: new ConfiguredDataSource(async () => {
        return [{ key: 'foo', value: 'bar' }];
      }),
    },
  });

  storage.store(cache);
});
