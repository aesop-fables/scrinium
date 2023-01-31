import { createServiceModule, inject } from '@aesop-fables/containr';
import { IVideoApi, VideoApi } from './VideoApi';
import { VideoServices } from './VideoServices';
import axios, { AxiosInstance } from 'axios';

export const useVideos = createServiceModule('videos', (services) => {
  services.register<AxiosInstance>(VideoServices.VideoAxios, () => {
    return axios.create({
      baseURL: '/',
    });
  });
  services.use<IVideoApi>(VideoServices.VideoApi, VideoApi);
});
