import { inject } from '@aesop-fables/containr';
import { AxiosInstance, AxiosResponse } from 'axios';
import { VideoServices } from './VideoServices';

export interface VideoListingItem {
  id: string;
  title: string;
  duration: number;
}

export interface VideoRest {
  id: string;
  title: string;
}

export interface VideoMetadataRest {
  id: string;
  duration: number;
  url: string;
}

export interface IVideoApi {
  getLibrary(): Promise<AxiosResponse<VideoListingItem[]>>;
  getVideo(id: string): Promise<AxiosResponse<VideoRest>>;
  getMetadata(id: string): Promise<AxiosResponse<VideoMetadataRest>>;
}

export class VideoApi implements IVideoApi {
  constructor(@inject(VideoServices.VideoAxios) private readonly axios: AxiosInstance) {}

  async getLibrary(): Promise<AxiosResponse<VideoListingItem[]>> {
    const response = await this.axios.get('/sample-data.json');
    const { data } = response;

    return {
      ...response,
      data: data.metadata as VideoListingItem[],
    };
  }

  async getVideo(id: string): Promise<AxiosResponse<VideoRest>> {
    const response = await this.axios.get('/sample-data.json');
    const { data } = response;

    return {
      ...response,
      data: (data.videos as VideoRest[]).find((x) => x.id === id) as VideoRest,
    };
  }
  
  async getMetadata(id: string): Promise<AxiosResponse<VideoMetadataRest>> {
    const response = await this.axios.get('/sample-data.json');
    const { data } = response;

    return {
      ...response,
      data: (data.metadata as VideoMetadataRest[]).find((x) => x.id === id) as VideoMetadataRest,
    };
  }
}