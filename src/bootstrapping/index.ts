import { Scopes, createServiceModuleWithOptions } from '@aesop-fables/containr';
import { DataCacheRegistry, ScriniumBootstrappingOptions } from './useDataCache';
import { ISubjectResolver, SubjectResolver } from '../ISubject';
import { ScriniumServices } from '../ScriniumServices';
import { ApplicationState } from '../ApplicationState';

export * from './useDataCache';

export const useScrinium = createServiceModuleWithOptions<ScriniumBootstrappingOptions>(
  '@aesop-fables/scrinium',
  (services, options) => {
    services.include(new DataCacheRegistry(options.modules));
    services.autoResolve<ISubjectResolver>(ScriniumServices.SubjectResolver, SubjectResolver, Scopes.Singleton);
    services.autoResolve<ApplicationState>(ScriniumServices.ApplicationState, ApplicationState, Scopes.Singleton);
  },
);
