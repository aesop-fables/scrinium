import { createServiceModule } from "@aesop-fables/containr";
import { IVideoApi, VideoApi } from "./VideoApi";
import { VideoServices } from "./VideoServices";
import axios, { AxiosInstance } from 'axios';

export const useVideos = createServiceModule('videos', (services) => {
  services.register<AxiosInstance>(VideoServices.VideoAxios, (_container) => {
    return axios.create({
      baseURL: 'https://github.com/aesop-fables/scrinium/blob/examples/examples/sample-web/src/videos/',
    })}
  );
  services.use<IVideoApi>(VideoServices.VideoApi, VideoApi);
});