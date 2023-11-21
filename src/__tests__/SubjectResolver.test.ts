import 'reflect-metadata';
import { Scopes, ServiceCollection, createContainer, createServiceModule, inject } from '@aesop-fables/containr';
import { BehaviorSubject, Observable, firstValueFrom, timeout } from 'rxjs';
import {
  ConfiguredDataSource,
  createDataCache,
  createDataCacheModule,
  DataCache,
  DataCompartmentOptions,
  fromAppStorage,
  IAppStorage,
  injectSubject,
  ISubject,
  ISubjectResolver,
  predicate,
  Predicate,
  ScriniumServices,
  SubjectResolver,
  useScrinium,
} from '..';

const messageCache = 'MessageCache';
const sampleKey = 'sampleKey';
interface IMessageCache {
  latestMessage(): string;
}

let sampleCount = 0;
class SampleSubject implements ISubject<string> {
  constructor(@inject(messageCache) private readonly cache: IMessageCache) {
    ++sampleCount;
  }

  createObservable(): Observable<string> {
    const subject = new BehaviorSubject<string>(this.cache.latestMessage());
    return subject.pipe();
  }
}

describe('SubjectResolver', () => {
  beforeEach(() => {
    sampleCount = 0;
  });

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

    const resolver = new SubjectResolver(services.buildContainer());
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

    const resolver = new SubjectResolver(services.buildContainer());
    const observable$ = resolver.resolveSubject(SampleSubject);

    expect(await firstValueFrom(observable$)).toBe(message);
  });

  test('resolves the subject (only once) and creates the observable', async () => {
    const message = 'Hello, World!';
    const cache: IMessageCache = {
      latestMessage() {
        return message;
      },
    };
    const services = new ServiceCollection();
    services.singleton<IMessageCache>(messageCache, cache);

    const resolver = new SubjectResolver(services.buildContainer());
    resolver.resolveSubject(SampleSubject);
    resolver.resolveSubject(SampleSubject);
    resolver.resolveSubject(SampleSubject);

    expect(sampleCount).toBe(1);
  });
});

interface AccountDto {
  username: string;
  firstName: string;
  lastName: string;
}

interface Preference {
  key: string;
  value?: string;
}

const accountsKey = 'accounts';

interface AccountCompartments {
  account: DataCompartmentOptions<AccountDto | undefined>;
}

const preferencesKey = 'preferences';

interface PreferenceCompartments {
  preferences: DataCompartmentOptions<Preference[]>;
}

class AccountLoadedPredicate implements Predicate {
  constructor(@fromAppStorage(accountsKey) private readonly cache: DataCache<AccountCompartments>) {}

  createObservable(): Observable<boolean> {
    return this.cache.initialized$();
  }
}

const predicateKey = 'predicateSubject';

@predicate(predicateKey)
class PreferencesSubject implements ISubject<Preference[]> {
  constructor(@fromAppStorage(preferencesKey) private readonly cache: DataCache<PreferenceCompartments>) {}

  createObservable() {
    return this.cache.observe$<Preference[]>('preferences');
  }
}

const withAccountData = createDataCacheModule((storage) => {
  const cache = createDataCache<AccountCompartments>({
    account: {
      autoLoad: false,
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

  storage.store(accountsKey, cache);
});

const withPreferencesData = createDataCacheModule((storage) => {
  const cache = createDataCache<PreferenceCompartments>({
    preferences: {
      autoLoad: true,
      defaultValue: [],
      source: new ConfiguredDataSource(async () => {
        return [{ key: 'foo', value: 'bar' }];
      }),
    },
  });

  storage.store(preferencesKey, cache);
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

    const storage = container.get<IAppStorage>(ScriniumServices.AppStorage);
    const resolver = container.get<ISubjectResolver>(ScriniumServices.SubjectResolver);
    const accountCache = storage.retrieve<AccountCompartments>(accountsKey);
    const preferenceCache = storage.retrieve<PreferenceCompartments>(preferencesKey);

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
    services.autoResolve(sampleKey, SampleSubject, Scopes.Transient);

    const container = services.buildContainer();
    const sample = container.resolve(SampleService);
    expect(await sample.message()).toBe(message);
  });
});
