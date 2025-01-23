import 'reflect-metadata';
import { firstValueFrom } from 'rxjs';
import { DataStore } from '../DataStore';
import { createDataCatalogModule } from '../bootstrapping/useDataCache';
import { createDataCache } from '../DataCache';
import {
  BootstrappingServices,
  createContainer,
  createServiceModule,
  IActivator,
  IServiceModule,
  ServiceCollection,
} from '@aesop-fables/containr';
import { AccountCompartments, TestTokens, useDataCache } from './Common';
import { DataCompartmentOptions } from '../Compartments';
import { ConfiguredDataSource } from '../ConfiguredDataSource';
import { ScriniumServices } from '../ScriniumServices';
import { useScrinium } from '../bootstrapping';
import { DataStoreToken } from '../DataStoreToken';

class TestActivator implements IActivator {
  isActivated = false;

  activate(): void {
    this.isActivated = true;
  }
}

describe('Bootstrapping', () => {
  describe('createContainer', () => {
    test('Always configures the service modules', () => {
      const key = 'foo:bar';
      class MyServiceModule implements IServiceModule {
        get name(): string {
          return key;
        }

        configureServices(services: ServiceCollection): void {
          services.use(key, MyServiceModule);
        }
      }
      const container = createContainer([new MyServiceModule()]);
      expect(container.get<MyServiceModule>(key).name).toBe(key);
    });

    test('Runs the activators when setting is true', () => {
      const testModule = createServiceModule('test', (services) => {
        services.add<IActivator>(BootstrappingServices.Activators, TestActivator);
      });

      const container = createContainer([testModule], { runActivators: true });
      const [activator] = container.get<IActivator[]>(BootstrappingServices.Activators);
      expect((activator as TestActivator).isActivated).toBeTruthy();
    });

    test('Does not run the activators when setting is false', () => {
      const testModule = createServiceModule('test', (services) => {
        services.add<IActivator>(BootstrappingServices.Activators, TestActivator);
      });

      const container = createContainer([testModule], { runActivators: false });
      const [activator] = container.get<IActivator[]>(BootstrappingServices.Activators);
      expect((activator as TestActivator).isActivated).toBeFalsy();
    });
  });

  describe('useDataCache', () => {
    test('Configures the DataStore with the specified data caches', async () => {
      const withAccountStorage = createDataCatalogModule((dataStore) => {
        const dataCache = createDataCache<AccountCompartments>(TestTokens.account, {
          plans: {
            loadingOptions: {
              strategy: 'manual',
            },
            source: new ConfiguredDataSource(async () => [
              { id: 1, title: 'Account 1', investments: [] },
              { id: 2, title: 'Account 2', investments: [] },
              { id: 10, title: 'Account 3', investments: [] },
            ]),
            defaultValue: [],
          },
        });

        dataStore.registerCache(dataCache);
      });

      const configureAppStorage = useDataCache([withAccountStorage]);
      const container = createContainer([configureAppStorage]);

      const dataStore = container.get<DataStore>(ScriniumServices.DataStore);
      const cache = dataStore.cache<AccountCompartments>(TestTokens.account);
      await cache.reload('plans');

      expect(await firstValueFrom(cache.observe$('plans'))).toHaveLength(3);
    });
  });

  describe('Integration', () => {
    interface SampleCompartments {
      test: DataCompartmentOptions<string>;
    }

    const sampleDataKey = new DataStoreToken('test');

    const withSampleData = createDataCatalogModule((dataStore) => {
      const cache = createDataCache<SampleCompartments>(sampleDataKey, {
        test: {
          defaultValue: '',
          source: new ConfiguredDataSource(async () => {
            console.log('Loading sample data');
            return 'Hello, World!';
          }),
          loadingOptions: {
            strategy: 'auto',
          },
        },
      });

      dataStore.registerCache(cache);
    });

    test('Allow app storage modules to inject DataStore', async () => {
      const container = createContainer([
        useScrinium({
          modules: [withSampleData],
        }),
      ]);

      const dataStore = container.get<DataStore>(ScriniumServices.DataStore);
      const sampleCache = dataStore.cache<SampleCompartments>(sampleDataKey);

      const waitForSampleCacheToInitialize = () => {
        return new Promise<boolean>((resolve) => {
          sampleCache.initialized$.subscribe({
            next: (value: boolean) => {
              if (value) resolve(value);
            },
          });
        });
      };

      await waitForSampleCacheToInitialize();
      const initialized = await firstValueFrom(sampleCache.initialized$);
      expect(initialized).toBeTruthy();

      const value = await firstValueFrom(sampleCache.observe$<string>('test'));
      expect(value).toEqual('Hello, World!');
    });
  });
});
