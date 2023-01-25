import React from 'react';
import logo from './logo.svg';
import './App.css';
import { bootstrap } from './Bootstrap';
import { ServiceProvider } from '@aesop-fables/containr-react';
import { useObservable, useProjection } from '@aesop-fables/scrinium';
import { VideoLibrary } from './videos/VideoProjections';
import { combineLatest } from 'rxjs';

const container = bootstrap();
function App() {
  return (
    <ServiceProvider rootContainer={container}>
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

export default App;
