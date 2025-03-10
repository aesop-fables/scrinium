import 'reflect-metadata';
import { Scopes, ServiceCollection, createContainer, createServiceModule, inject } from '@aesop-fables/containr';
import {
  BehaviorSubject,
  Observable,
  firstValueFrom,
  // of,
  timeout,
} from 'rxjs';
import {
  ConfiguredDataSource,
  createDataCache,
  createDataCatalogModule,
  DataCache,
  DataCompartmentOptions,
  injectDataCache,
  DataStore,
  injectSubject,
  ISubject,
  ISubjectResolver,
  predicate,
  Predicate,
  ScriniumServices,
  SubjectResolver,
  useScrinium,
  DataCatalog,
} from '..';
import { DataStoreToken } from '../DataStoreToken';

const messageCache = 'MessageCache';
const sampleKey = 'sampleKey';
interface IMessageCache {
  latestMessage(): string;
}

class SampleSubject implements ISubject<string> {
  constructor(@inject(messageCache) private readonly cache: IMessageCache) {}

  createObservable(): Observable<string> {
    const subject = new BehaviorSubject<string>(this.cache.latestMessage());
    return subject.pipe();
  }
}

describe('SubjectResolver', () => {
  test('resolves the subject by key and creates the observable', async () => {
    const message = 'Hello, World!';
    const cache: IMessageCache = {
      latestMessage() {
        return message;
      },
    };
    const services = new ServiceCollection();
    services.singleton<IMessageCache>(messageCache, cache);
    services.autoResolve(sampleKey, SampleSubject, Scopes.Transient);

    const resolver = new SubjectResolver(services.buildContainer(), new DataStore(new DataCatalog()));
    const observable$ = resolver.resolveSubjectByKey<string>(sampleKey);

    expect(await firstValueFrom(observable$)).toBe(message);
  });

  test('resolves the subject and creates the observable', async () => {
    const message = 'Hello, World!';
    const cache: IMessageCache = {
      latestMessage() {
        return message;
      },
    };
    const services = new ServiceCollection();
    services.singleton<IMessageCache>(messageCache, cache);

    const resolver = new SubjectResolver(services.buildContainer(), new DataStore(new DataCatalog()));
    const observable$ = resolver.resolveSubject(SampleSubject);

    expect(await firstValueFrom(observable$)).toBe(message);
  });
});

interface AccountDto {
  username: string;
  firstName: string;
  lastName: string;
}

interface UserDto {
  userId: number;
}

interface Preference {
  key: string;
  value?: string;
}

const accountsToken = new DataStoreToken('accounts');

interface AccountCompartments {
  account: DataCompartmentOptions<AccountDto | undefined>;
}

const userToken = new DataStoreToken('users');

interface UserCompartments {
  user: DataCompartmentOptions<UserDto | undefined>;
}

const preferencesToken = new DataStoreToken('preferences');

interface PreferenceCompartments {
  preferences: DataCompartmentOptions<Preference[]>;
}

class AccountLoadedPredicate implements Predicate {
  constructor(@injectDataCache(accountsToken.value) private readonly cache: DataCache<AccountCompartments>) {}

  createObservable(): Observable<boolean> {
    return this.cache.initialized$;
  }
}

const predicateKey = 'predicateSubject';

class UserLoadedPredicate implements Predicate {
  constructor(@injectDataCache(userToken.value) private readonly cache: DataCache<UserCompartments>) {}

  createObservable(): Observable<boolean> {
    return this.cache.initialized$;
  }
}

const userPredicateKey = 'userPredicateSubject';

@predicate(predicateKey)
class PreferencesSubject implements ISubject<Preference[]> {
  constructor(@injectDataCache(preferencesToken.value) private readonly cache: DataCache<PreferenceCompartments>) {}

  createObservable() {
    return this.cache.observe$<Preference[]>('preferences');
  }
}

@predicate(predicateKey)
@predicate(userPredicateKey)
class UserPreferencesSubject implements ISubject<Preference[]> {
  constructor(@injectDataCache(preferencesToken.value) private readonly cache: DataCache<PreferenceCompartments>) {}

  createObservable() {
    return this.cache.observe$<Preference[]>('preferences');
  }
}

const withAccountData = createDataCatalogModule((storage) => {
  const cache = createDataCache<AccountCompartments>(accountsToken, {
    account: {
      loadingOptions: {
        strategy: 'manual',
      },
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

  storage.registerCache(cache);
});

const withUserData = createDataCatalogModule((storage) => {
  const cache = createDataCache<UserCompartments>(userToken, {
    user: {
      loadingOptions: {
        strategy: 'manual',
      },
      defaultValue: undefined,
      source: new ConfiguredDataSource(async () => {
        return {
          userId: 0,
        };
      }),
    },
  });

  storage.registerCache(cache);
});

const withPreferencesData = createDataCatalogModule((storage) => {
  const cache = createDataCache<PreferenceCompartments>(preferencesToken, {
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

  storage.registerCache(cache);
});

describe('SubjectResolver w/ decorators', () => {
  test('invokes the predicate decorator by class', async () => {
    const predicateServices = createServiceModule('test', (services) => {
      services.autoResolve(predicateKey, AccountLoadedPredicate, Scopes.Singleton);
    });
    const container = createContainer([
      useScrinium({
        modules: [withAccountData, withPreferencesData],
      }),
      predicateServices,
    ]);

    const storage = container.get<DataStore>(ScriniumServices.DataStore);
    const resolver = container.get<ISubjectResolver>(ScriniumServices.SubjectResolver);
    const accountCache = storage.cache<AccountCompartments>(accountsToken);
    const preferenceCache = storage.cache<PreferenceCompartments>(preferencesToken);

    const subject$ = resolver.resolveSubject(PreferencesSubject);
    let hasError = false;

    try {
      await firstValueFrom(subject$.pipe(timeout({ each: 500 })));
    } catch {
      hasError = true;
    }

    expect(hasError).toBeTruthy();

    await accountCache.reloadAll();

    const preferences = await firstValueFrom(preferenceCache.observe$<Preference>('preferences'));
    const resolvedPreferences = await firstValueFrom(subject$.pipe(timeout({ each: 500 })));

    expect(preferences).toEqual(resolvedPreferences);
  });

  test('invokes the predicate decorator by class with multiple predicates', async () => {
    const predicateServices = createServiceModule('test', (services) => {
      services.autoResolve(predicateKey, AccountLoadedPredicate, Scopes.Singleton);
      services.autoResolve(userPredicateKey, UserLoadedPredicate, Scopes.Singleton);
    });
    const container = createContainer([
      useScrinium({
        modules: [withAccountData, withUserData, withPreferencesData],
      }),
      predicateServices,
    ]);

    const storage = container.get<DataStore>(ScriniumServices.DataStore);
    const resolver = container.get<ISubjectResolver>(ScriniumServices.SubjectResolver);
    const accountCache = storage.cache<AccountCompartments>(accountsToken);
    const userCache = storage.cache<UserCompartments>(userToken);
    const preferenceCache = storage.cache<PreferenceCompartments>(preferencesToken);

    const subject$ = resolver.resolveSubject(UserPreferencesSubject);
    let hasError = false;

    // fails when neither cache is initialized
    try {
      await firstValueFrom(subject$.pipe(timeout({ each: 500 })));
    } catch {
      hasError = true;
    }

    expect(hasError).toBeTruthy();

    await accountCache.reloadAll();

    // fails when userCache is not initialized
    try {
      hasError = false;
      await firstValueFrom(subject$.pipe(timeout({ each: 500 })));
    } catch {
      hasError = true;
    }

    expect(hasError).toBeTruthy();

    await userCache.reloadAll();

    // fails when accountCache is not initialized
    try {
      accountCache.resetAll();
      hasError = false;
      await firstValueFrom(subject$.pipe(timeout({ each: 500 })));
    } catch {
      hasError = true;
    }

    expect(hasError).toBeTruthy();

    await accountCache.reloadAll();

    // resolves once both caches are initialized
    const preferences = await firstValueFrom(preferenceCache.observe$<Preference>('preferences'));
    const resolvedPreferences = await firstValueFrom(subject$.pipe(timeout({ each: 500 })));

    expect(preferences).toEqual(resolvedPreferences);
  });
});

describe('@injectSubject', () => {
  class SampleService {
    constructor(@injectSubject(sampleKey) private readonly message$: Observable<string>) {}

    message(): Promise<string> {
      return firstValueFrom(this.message$);
    }
  }

  test('resolves the subject by key and creates the observable', async () => {
    const message = 'Hello, World!';
    const cache: IMessageCache = {
      latestMessage() {
        return message;
      },
    };
    const services = new ServiceCollection();
    services.autoResolve<ISubjectResolver>(ScriniumServices.SubjectResolver, SubjectResolver, Scopes.Transient);
    services.singleton<IMessageCache>(messageCache, cache);
    services.singleton(ScriniumServices.DataStore, new DataStore(new DataCatalog()));
    services.autoResolve(sampleKey, SampleSubject, Scopes.Transient);

    const container = services.buildContainer();
    const sample = container.resolve(SampleService);
    expect(await sample.message()).toBe(message);
  });
});
