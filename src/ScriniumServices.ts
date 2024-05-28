import { DataCacheServices } from './bootstrapping/DataCacheServices';

export const ScriniumServices = {
  ...DataCacheServices,
  ApplicationState: '@aesop-fables/scrinium/applicationState',
  // ProjectionContext: '@aesop-fables/scrinium/projections',
};
