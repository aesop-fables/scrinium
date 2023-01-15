import { firstValueFrom } from 'rxjs';
import { IAppStorage } from '../AppStorage';
import {
  BootstrappingServices,
  createContainer,
  createServiceModule,
  IActivator,
  IServiceModule,
} from '../bootstrapping';
import { createDataCacheModule, DataCacheServices, useDataCache } from '../bootstrapping/useDataCache';
import { createDataCache } from '../DataCache';
import { ServiceCollection } from '@aesop-fables/containr';
import { AccountCompartments } from './Common';
import { ConfiguredDataSource } from '../Compartments';

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
            autoLoad: false,
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

      const appStorage = container.get<IAppStorage>(DataCacheServices.AppStorage);
      const cache = appStorage.retrieve<AccountCompartments>(accountsKey);
      await cache.reload('plans');

      expect(await firstValueFrom(cache.observe$('plans'))).toHaveLength(3);
    });
  });
});
