import 'reflect-metadata';
import { Observable, firstValueFrom, of } from 'rxjs';
import { IAppStorage } from '../AppStorage';
import { createDataCacheModule, useDataCache } from '../bootstrapping/useDataCache';
import { createDataCache } from '../DataCache';
import {
  BootstrappingServices,
  createContainer,
  createServiceModule,
  IActivator,
  inject,
  IServiceModule,
  ServiceCollection,
} from '@aesop-fables/containr';
import { AccountCompartments } from './Common';
import { ConfiguredDataSource, DataCompartmentOptions } from '../Compartments';
import { ScriniumServices } from '../ScriniumServices';
import { useScrinium } from '../bootstrapping';

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
    test('Configures the IAppStorage with the specified data caches', async () => {
      const accountsKey = 'accounts';
      const withAccountStorage = createDataCacheModule((appStorage) => {
        const dataCache = createDataCache<AccountCompartments>({
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

        appStorage.store<AccountCompartments>(accountsKey, dataCache);
      });

      const configureAppStorage = useDataCache([withAccountStorage]);
      const container = createContainer([configureAppStorage]);

      const appStorage = container.get<IAppStorage>(ScriniumServices.AppStorage);
      const cache = appStorage.retrieve<AccountCompartments>(accountsKey);
      await cache.reload('plans');

      expect(await firstValueFrom(cache.observe$('plans'))).toHaveLength(3);
    });
  });

  describe('Integration', () => {
    interface SampleCompartments {
      test: DataCompartmentOptions<string>;
    }

    const sampleDataKey = 'test';

    const withSampleData = createDataCacheModule((appStorage) => {
      const cache = createDataCache<SampleCompartments>({
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

      appStorage.store(sampleDataKey, cache);
    });

    test('Allow app storage modules to inject IAppStorage', async () => {
      const container = createContainer([
        useScrinium({
          modules: [withSampleData],
        }),
      ]);

      const appStorage = container.get<IAppStorage>(ScriniumServices.AppStorage);
      const sampleCache = appStorage.retrieve<SampleCompartments>(sampleDataKey);

      const waitForSampleCacheToInitialize = () => {
        return new Promise<boolean>((resolve) => {
          sampleCache.initialized$.subscribe({
            next: (value: boolean) => {
              resolve(value);
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
