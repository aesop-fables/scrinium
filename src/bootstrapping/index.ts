import { createServiceModuleWithOptions } from '@aesop-fables/containr';
import { DataCacheRegistry, DataCacheServices, IAppStorageModule } from './useDataCache';
import { ISubjectResolver, SubjectResolver } from '../ISubject';

export * from './useDataCache';

export interface ScriniumBootstrappingOptions {
  modules: IAppStorageModule[];
}

export const useScrinium = createServiceModuleWithOptions<ScriniumBootstrappingOptions>(
  '@aesop-fables/scrinium',
  (services, options) => {
    services.include(new DataCacheRegistry(options.modules));
    services.register<ISubjectResolver>(
      DataCacheServices.SubjectResolver,
      (container) => new SubjectResolver(container),
    );
  },
);
