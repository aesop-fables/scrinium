import { createServiceModule } from "@aesop-fables/containr";
import { VideoApi } from "./VideoApi";
import { VideoServices } from "./VideoServices";
import axios from 'axios';

export const useVideos = createServiceModule('videos', (services) => {
  services.register(VideoServices.VideoAxios, axios.create({
    baseURL: 'https://github.com/aesop-fables/scrinium/blob/examples/examples/sample-web/src/videos/',
  }));

  services.use(VideoServices.VideoApi, VideoApi);
});