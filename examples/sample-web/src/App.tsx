import React from 'react';
import { combineLatest } from 'rxjs';
// import './App.css';
import { bootstrap } from './Bootstrap';
import { ServiceProvider } from '@aesop-fables/containr-react';
import { useObservable, useProjection } from '@aesop-fables/scrinium';
import { FindVideoByIdProjection, VideoLibrary } from './videos/VideoProjections';

const container = bootstrap();

function App() {
  return (
    <ServiceProvider rootContainer={container}>
      <div className="App">
        <header className="App-header">
          <img src="./logo.svg" className="App-logo" alt="logo" width="200" />
          <p>
            Edit <code>src/App.tsx</code> and save to reload.
          </p>
          <a className="App-link" href="https://reactjs.org" target="_blank" rel="noopener noreferrer">
            Learn React
          </a>
        </header>
        <VideoGallery />
      </div>
    </ServiceProvider>
  );
}

const VideoGallery: React.FC = () => {
  const { loading$, library$ } = useProjection(VideoLibrary);
  const [loading, library] = useObservable(combineLatest([loading$, library$])) ?? [true, []];

  if (loading) {
    return (
      <>
        <p>Loading...</p>
      </>
    );
  }

  return (
    <>
      <ul>
        {library.map((item) => (
          <li key={item.id}>
            <a href={`/videos/${item.id}`}>
              <h3>{item.title}</h3>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
};

interface VideoViewerProps {
  videoId: string;
}

const VideoViewer: React.FC<VideoViewerProps> = ({ videoId }) => {
  const { loading$, video$ } = useProjection(new FindVideoByIdProjection(videoId));
  const [loading, video] = useObservable(combineLatest([loading$, video$])) ?? [true, undefined];
  if (loading) {
    return (
      <>
        <p>Loading...</p>
      </>
    );
  }

  return (
    <>
      <h3>{video?.title}</h3>
      {/* <VideoPlayer url={video?.url} /> */}
    </>
  );
};

export default App;
