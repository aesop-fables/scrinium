import 'reflect-metadata';
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import {
  ConfiguredDataSource,
  DataCache,
  DataCacheRegistry,
  DataCompartmentOptions,
  IListener,
  ISubject,
  ISubjectResolver,
  ScriniumServices,
  SubjectResolver,
  createDataCache,
  createDataCacheModule,
  injectDataCache,
  injectSubject,
  useAppStorage,
  useListener,
  useObservable,
  useSubject,
} from '..';
import { InteractionContext } from './InteractionContext';
import { BehaviorSubject, Observable, Observer, Subscription, combineLatest, map } from 'rxjs';
import { Scopes, ServiceCollection, inject } from '@aesop-fables/containr';
import { useService } from '@aesop-fables/containr-react';

const TestServices = {
  authContext: 'authContext',
  accountApi: 'accountApi',
  personApi: 'personApi',
  authSubject: 'authSubject',
};

class AuthenticationContext {
  private readonly isAuthenticated = new BehaviorSubject(false);

  get isAuthenticated$() {
    return this.isAuthenticated.pipe();
  }

  authenticate() {
    this.isAuthenticated.next(true);
  }

  signOut() {
    this.isAuthenticated.next(false);
  }
}

class AuthenticationSubject implements ISubject<boolean> {
  constructor(@inject(TestServices.authContext) private readonly context: AuthenticationContext) {}

  createObservable(): Observable<boolean> {
    return this.context.isAuthenticated$;
  }
}

interface AccountRest {
  id: string;
  username: string;
}

interface PersonRest {
  firstName: string;
  lastName: string;
}

const userCompartmentKey = 'users';

interface UserCompartments {
  account: DataCompartmentOptions<AccountRest | undefined>;
  person: DataCompartmentOptions<PersonRest | undefined>;
}

declare type UserData = DataCache<UserCompartments>;

interface IAccountApi {
  load(): Promise<AccountRest>;
}

interface IPersonApi {
  load(): Promise<PersonRest>;
}

class UserDataFactory {
  constructor(
    @inject(TestServices.accountApi) private readonly accountApi: IAccountApi,
    @inject(TestServices.personApi) private readonly personApi: IPersonApi,
  ) {}

  create() {
    return createDataCache<UserCompartments>({
      account: {
        defaultValue: undefined,
        autoLoad: false,
        source: new ConfiguredDataSource<AccountRest>(async () => {
          return this.accountApi.load();
        }),
      },
      person: {
        defaultValue: undefined,
        autoLoad: false,
        source: new ConfiguredDataSource<PersonRest>(async () => {
          return this.personApi.load();
        }),
      },
    });
  }
}

const withUserData = createDataCacheModule((storage, container) => {
  const factory = container.resolve(UserDataFactory);
  const cache = factory.create();

  storage.store(userCompartmentKey, cache);
});

class PrincipalUser {
  constructor(private readonly account: AccountRest, private readonly person: PersonRest) {}

  get username() {
    return this.account?.username;
  }

  get firstName() {
    return this.person?.firstName;
  }

  get lastName() {
    return this.person?.lastName;
  }
}

class PrincipalUserSubject implements ISubject<PrincipalUser> {
  constructor(@injectDataCache(userCompartmentKey) private readonly userData: UserData) {}

  createObservable(): Observable<PrincipalUser> {
    return combineLatest([
      this.userData.observe$<AccountRest>('account'),
      this.userData.observe$<PersonRest>('person'),
    ]).pipe(map(([account, person]) => new PrincipalUser(account, person)));
  }
}

class TestAppListener implements IListener, Partial<Observer<boolean>> {
  private initialized = false;

  constructor(
    @injectSubject(TestServices.authSubject) private readonly isAuthenticated$: Observable<boolean>,
    @injectDataCache(userCompartmentKey) private readonly userData: UserData,
  ) {}

  start(): Subscription {
    return this.isAuthenticated$.subscribe(this);
  }

  next(isAuthenticated: boolean) {
    if (isAuthenticated && !this.initialized) {
      this.userData.reloadAll();
      this.initialized = true;
    }
  }
}

const TestApp: React.FC = () => {
  useListener(TestAppListener);

  return <HomeScreen />;
};

const useIsAuthenticated = () => {
  return useSubject(AuthenticationSubject) ?? false;
};

const usePrincipalUser = () => {
  return useSubject(PrincipalUserSubject) ?? ({} as PrincipalUser);
};

const useAuthenticationContext = () => {
  return useService<AuthenticationContext>(TestServices.authContext);
};

const useUserData = () => {
  const storage = useAppStorage();
  return storage.retrieve<UserCompartments>(userCompartmentKey);
};

const useIsAppReady = () => {
  const userData = useUserData();
  return useObservable(userData.initialized$()) ?? false;
};

const HomeScreen: React.FC = () => {
  const isLoggedIn = useIsAuthenticated();
  return (
    <>
      {isLoggedIn && <AuthenticatedScreen />}
      {!isLoggedIn && <UnauthenticatedScreen />}
    </>
  );
};

const AuthenticatedScreen: React.FC = () => {
  const user = usePrincipalUser();
  const authContext = useAuthenticationContext();
  const appReady = useIsAppReady();
  const clickHandler = () => {
    authContext.signOut();
  };

  if (!appReady) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <p>
        Well hello there, {user.firstName} {user.lastName}
      </p>
      <button type="button" onClick={() => clickHandler()}>
        Logout
      </button>
    </div>
  );
};

const UnauthenticatedScreen: React.FC = () => {
  return (
    <div>
      <p>Can we help you?</p>
    </div>
  );
};

describe('useSubject', () => {
  test('Render the user', async () => {
    const account: AccountRest = {
      id: '1234',
      username: 'test-user',
    };

    const person: PersonRest = {
      firstName: 'Tester',
      lastName: 'McTester',
    };

    const accountApi: IAccountApi = {
      async load() {
        return account;
      },
    };

    const personApi: IPersonApi = {
      async load() {
        return person;
      },
    };

    const authContext = new AuthenticationContext();
    const configureServices = (services: ServiceCollection) => {
      services.include(new DataCacheRegistry([withUserData]));
      services.singleton(TestServices.accountApi, accountApi);
      services.singleton(TestServices.authContext, authContext);
      services.singleton(TestServices.personApi, personApi);
      services.autoResolve(TestServices.authSubject, AuthenticationSubject, Scopes.Singleton);
      services.autoResolve<ISubjectResolver>(ScriniumServices.SubjectResolver, SubjectResolver, Scopes.Transient);
    };

    render(
      <InteractionContext configureServices={configureServices}>
        <TestApp />
      </InteractionContext>,
    );

    await waitFor(() => screen.getByText(/Can we help you/i));

    await act(async () => {
      authContext.authenticate();
    });

    await waitFor(() => screen.getByText(/Well hello there/i));
  });
});
