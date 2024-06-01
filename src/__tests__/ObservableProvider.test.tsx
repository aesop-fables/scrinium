/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { ObservableOptions, useSubject } from '../hooks';
import { ServiceProvider } from '@aesop-fables/containr-react';
import { IServiceContainer, createContainer, createServiceModule } from '@aesop-fables/containr';
import React from 'react';
import { ISubject } from '../ISubject';
import { BehaviorSubject } from 'rxjs';
import { render, screen } from '@testing-library/react';
import { ObservableProvider } from '../ObservableProvider';
import { useScrinium } from '../bootstrapping';

type AppProps = {
  container: IServiceContainer;
} & PropsWithChildren;

const App: React.FC<AppProps> = ({ container, children }) => {
  const [error, setError] = useState<any>();
  const errorHandler = useCallback(
    (err: any) => {
      setError(err);
    },
    [setError],
  );

  const options: ObservableOptions = useMemo(() => {
    return {
      errorHandler,
    };
  }, [error]);

  return (
    <ServiceProvider rootContainer={container}>
      <ObservableProvider options={options}>
        {!error && <>{children}</>}
        {error && <ErrorScreen error={error} />}
      </ObservableProvider>
    </ServiceProvider>
  );
};

const ErrorScreen: React.FC<{ error: any }> = ({ error }) => {
  return <p data-testid="error">{error.message}</p>;
};

type SubjectDisplayProps = {
  subject: string;
};

function SubjectDisplay<T>(props: SubjectDisplayProps) {
  const value = useSubject<T>(props.subject);
  return <p data-testid="subject">{JSON.stringify(value)}</p>;
}

function pause(timeout = 100) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

describe('ObservableProvider', () => {
  describe('Integration', () => {
    test('Catches the underlying error', async () => {
      const key = 'test';
      const container = createContainer([
        useScrinium({
          modules: [],
        }),
        createServiceModule('tests', (services) => {
          services.singleton<ISubject<string>>(key, {
            createObservable() {
              const val = new BehaviorSubject<string>('Testing...');
              val.error(new Error('Catch me'));
              return val.pipe();
            },
          });
        }),
      ]);

      render(
        <App container={container}>
          <SubjectDisplay<string> subject={key} />
        </App>,
      );

      await pause();

      const error = await screen.findByTestId('error');
      expect(error.textContent).toBe('Catch me');
    });
  });
});
