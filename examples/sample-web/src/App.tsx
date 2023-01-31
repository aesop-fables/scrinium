import React from 'react';
import logo from './logo.svg';
import './App.css';
import { bootstrap } from './Bootstrap';
import { ServiceProvider } from '@aesop-fables/containr-react';
import { AppStorageProvider, DataCacheServices, IAppStorage, useObservable, useProjection, useRepositoryProjection } from '@aesop-fables/scrinium';
import { FindVideoByIdProjection, VideoLibrary } from './videos/VideoProjections';
import { combineLatest } from 'rxjs';
import { VideoRegistry, VideoRest } from './videos';

const container = bootstrap();
function App() {
  const appStorage = container.get<IAppStorage>(DataCacheServices.AppStorage);

  return (
    <ServiceProvider rootContainer={container}>
      <AppStorageProvider storage={appStorage}>
        <div className="App">
          <header className="App-header">
            <img src={logo} className="App-logo" alt="logo" />
            <p>
              Edit <code>src/App.tsx</code> and save to reload.
            </p>
            <a
              className="App-link"
              href="https://reactjs.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn React
            </a>
          </header>
          <VideoGallery />
        </div>
      </AppStorageProvider>
    </ServiceProvider>
  );
}

const VideoGallery: React.FC = () => {
  const { loading$, library$ } = useProjection(VideoLibrary);
  const [loading, library] = useObservable(combineLatest([loading$, library$])) ?? [true, []];

  if (loading) {
    return <><p>Loading...</p></>;
  }

  return (
    <>
    <ul>
      {library.map((item) => (
        <li key={item.id}>
          <a href={`/videos/${item.id}`}><h3>{item.title}</h3></a>
        </li>
      ))}
    </ul>
    </>
  )
};

interface VideoViewerProps {
  videoId: string;
}

const VideoViewer: React.FC<VideoViewerProps> = ({ videoId }) => {
  const { loading$, video$ } = useProjection(new FindVideoByIdProjection(videoId));
  const [loading, video] = useObservable(combineLatest([loading$, video$])) ?? [true, undefined];
  if (loading) {
    return <><p>Loading...</p></>;
  }

  return (
    <>
      <h3>{video?.title}</h3>
      {/* <VideoPlayer url={video?.url} /> */}
    </>
  )
};

export default App;
