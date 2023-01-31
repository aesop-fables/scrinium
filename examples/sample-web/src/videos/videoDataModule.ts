import { IServiceContainer } from '@aesop-fables/containr';
import {
  ConfiguredDataSource,
  ConfiguredEntityResolver,
  createDataCache,
  createDataCacheModule,
  createRepository,
  DataCompartmentOptions,
  IAppStorage,
  RepositoryCompartmentOptions,
} from '@aesop-fables/scrinium';
import { IVideoApi, VideoListingItem, VideoMetadataRest, VideoRest } from './VideoApi';
import { VideoServices } from './VideoServices';

export const VideoDataCache = 'scrinium/examples/videos/dataCache';
export const VideoRepository = 'scrinium/examples/videos/repository';

// In this example, we're pretending that the data we need
// comes from three separate endpoints that we need to merge together
export interface VideoCompartments {
  library: DataCompartmentOptions<VideoListingItem[]>;
}

export interface VideoRegistry {
  videos: RepositoryCompartmentOptions<string, VideoRest>;
  metadata: RepositoryCompartmentOptions<string, VideoMetadataRest>;
}

export const withVideoDataModule = createDataCacheModule((appStorage: IAppStorage, container: IServiceContainer) => {
  const api = container.get<IVideoApi>(VideoServices.VideoApi);

  const repository = createRepository<VideoRegistry>({
    metadata: {
      resolver: new ConfiguredEntityResolver<string, VideoMetadataRest>(async (key) => {
        const { data } = await api.getMetadata(key);
        return data;
      }),
    },
    videos: {
      resolver: new ConfiguredEntityResolver<string, VideoRest>(async (key) => {
        const { data } = await api.getVideo(key);
        return data;
      }),
    },
  });

  const dataCache = createDataCache<VideoCompartments>({
    library: {
      defaultValue: [],
      source: new ConfiguredDataSource(async () => {
        const { data } = await api.getLibrary();
        return data;
      }),
      autoLoad: true,

      // TODO -- We probably want to prevent this from loading at all if the user isn't authenticated
      // dependsOn: isAuthenticated$,
    },
  });

  appStorage.store(VideoDataCache, dataCache);
  appStorage.store(VideoRepository, repository);
});
