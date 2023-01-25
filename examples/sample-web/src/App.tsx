import React from 'react';
import logo from './logo.svg';
import './App.css';
import { bootstrap } from './Bootstrap';
import { ServiceProvider } from '@aesop-fables/containr-react';

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
      </div>
    </ServiceProvider>
  );
}

export default App;
