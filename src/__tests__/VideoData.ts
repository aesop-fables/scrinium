/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContainer, inject, IServiceContainer, IServiceModule } from '@aesop-fables/containr';
import { DataCatalogModule } from '../bootstrapping/DataCatalogModule';
import { DataCompartmentOptions } from '../Compartments';
import { ConfiguredEntityResolver, createRepository, RepositoryCompartmentOptions } from '../Repository';
import {
  createDataModule,
  DataCatalogRegistration,
  DataCatalogRegistrations,
} from '../bootstrapping/createDataCatalogModule';
import { useScrinium } from '../bootstrapping';
import { DataStoreToken } from '../DataStoreToken';
import { createDataCache } from '../DataCache';
import { ConfiguredDataSource } from '../ConfiguredDataSource';

export interface Video {
  id: string;
  title: string;
}

export interface VideoMetadata {
  id: string;
  duration: number;
}

// In this example, we're pretending that the data we need
// comes from two separate APIs that we need to merge together
export interface VideoRegistry {
  videos: RepositoryCompartmentOptions<string, Video>;
  metadata: RepositoryCompartmentOptions<string, VideoMetadata>;
}

export type VideoCompartments = {
  mostRecent: DataCompartmentOptions<Video[]>;
};

export type VideoScenarioExpression = {
  mostRecent?: Video[];
  videos?: Record<string, Video>;
  metadata?: Record<string, VideoMetadata>;
};

export type IntegrationBootstrapOptions = {
  catalogModules?: DataCatalogModule[];
  scenario?: VideoScenarioExpression;
  serviceModules?: IServiceModule[];
};

export type HttpClientResponse<T> = {
  status: number;
  data: T;
};

export interface IHttpClient {
  get<T>(url: string): Promise<HttpClientResponse<T>>;
}

class InMemoryVideoHttpClient implements IHttpClient {
  private readonly routes: Record<string, HttpClientResponse<any>> = {};

  constructor(scenario: VideoScenarioExpression) {
    this.routes['/recent'] = {
      status: 200,
      data: scenario.mostRecent ?? [],
    };

    if (scenario.metadata) {
      for (const key in scenario.metadata) {
        this.routes[`/metadata/${key}`] = {
          status: 200,
          data: scenario.metadata[key],
        };
      }
    }

    if (scenario.videos) {
      for (const key in scenario.videos) {
        this.routes[`/videos/${key}`] = {
          status: 200,
          data: scenario.videos[key],
        };
      }
    }
  }

  async get<T>(url: string): Promise<HttpClientResponse<T>> {
    const route = this.routes[url];
    if (!route) {
      return {
        status: 404,
        data: null as unknown as T,
      };
    }

    return route;
  }
}

const VideoGalleryServices = {
  httpClient: 'httpClient',
};

const VideoGalleryTokens = {
  dashboard: new DataStoreToken('dashboard'),
  repository: new DataStoreToken('repository'),
};

export class VideoGalleryDataModule implements DataCatalogRegistration {
  constructor(@inject(VideoGalleryServices.httpClient) private readonly httpClient: IHttpClient) {}

  defineData(): DataCatalogRegistrations {
    const dashboardCache = createDataCache<VideoCompartments>(VideoGalleryTokens.dashboard, {
      mostRecent: {
        source: new ConfiguredDataSource(async () => {
          const response = await this.httpClient.get<Video[]>('/recent');
          return response.data;
        }),
        defaultValue: [],
      },
    });

    const repository = createRepository<VideoRegistry>(VideoGalleryTokens.repository, {
      metadata: {
        resolver: new ConfiguredEntityResolver<string, VideoMetadata>(async (key) => {
          const response = await this.httpClient.get<VideoMetadata>(`/metadata/${key}`);
          return response.data;
        }),
      },
      videos: {
        resolver: new ConfiguredEntityResolver<string, Video>(async (key) => {
          const response = await this.httpClient.get<Video>(`/videos/${key}`);
          return response.data;
        }),
      },
    });

    return {
      caches: [dashboardCache],
      repositories: [repository],
    };
  }
}

export const withVideoGalleryData = createDataModule(VideoGalleryDataModule);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createIntegrationContainer(options: IntegrationBootstrapOptions = {}): IServiceContainer {
  const modules: DataCatalogModule[] = [];
  const serviceModules: IServiceModule[] = [];
  if (options.scenario) {
    const httpClient = new InMemoryVideoHttpClient(options.scenario);
    serviceModules.push({
      name: 'httpClient',
      configureServices(services) {
        services.singleton<IHttpClient>(VideoGalleryServices.httpClient, httpClient);
      },
    });
  }

  modules.push(...(options.catalogModules ?? []));
  serviceModules.push(...(options.serviceModules ?? []));

  return createContainer([
    useScrinium({
      modules,
    }),
    ...serviceModules,
  ]);
}
