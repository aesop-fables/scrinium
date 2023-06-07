import { Scopes, createServiceModuleWithOptions } from '@aesop-fables/containr';
import { DataCacheRegistry, IAppStorageModule } from './useDataCache';
import { DataCacheServices } from './DataCacheServices';
import { ISubjectResolver, SubjectResolver } from '../ISubject';

export * from './useDataCache';

export interface ScriniumBootstrappingOptions {
  modules: IAppStorageModule[];
}

export const useScrinium = createServiceModuleWithOptions<ScriniumBootstrappingOptions>(
  '@aesop-fables/scrinium',
  (services, options) => {
    services.include(new DataCacheRegistry(options.modules));
    services.autoResolve<ISubjectResolver>(DataCacheServices.SubjectResolver, SubjectResolver, Scopes.Transient);
  },
);
