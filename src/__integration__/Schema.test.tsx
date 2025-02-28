/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import '@testing-library/jest-dom';
import React, { useMemo } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { createIntegrationContainer, VideoCompartments, VideoGalleryTokens } from '../__tests__/VideoData';
import { IServiceContainer } from '@aesop-fables/containr';
import { PropsWithChildren, useCallback, useState } from 'react';
import { ObservableOptions } from '../hooks/useObservable';
import { ServiceProvider } from '@aesop-fables/containr-react';
import { ObservableProvider } from '../ObservableProvider';
import { DashboardContainer } from './Dashboard';
import { createDataModule, DataCatalogRegistration, DataCatalogRegistrations } from '../bootstrapping';
import { configureDataCache, DataCache } from '../DataCache';
import { DataStoreToken } from '../DataStoreToken';
import { ConfiguredDataSource } from '../ConfiguredDataSource';
import { CommandExecutor, IRelayCommand } from '../commands';
import { injectDataCache } from '../Decorators';

describe('Schema Integration', () => {
  test('Compartment expires and reloads', async () => {
    const delay = 100;
    const container = createIntegrationContainer({
      catalogModules: [withIntegrationExtensions],
      scenario: {
        delay,
        mostRecent: [
          { id: '1', title: 'Overview' },
          { id: '2', title: 'Chapter 1: Introduction' },
        ],
      },
      schema: (schema) => {
        schema
          .source(IntegrationTokens.cacheBuster.compartment<IntegrationExtensions>('timestamp'))
          .resetsCompartment(VideoGalleryTokens.dashboard.compartment<VideoCompartments>('mostRecent'));
      },
    });

    const executor = container.resolve(CommandExecutor);
    const refreshHandler = () => executor.relay(BumpIntegrationTimestamp);
    render(
      <IntegrationProvider container={container}>
        <DashboardContainer onRefresh={refreshHandler} />
      </IntegrationProvider>,
    );

    // Verify the rendered videos
    const videos = await screen.findAllByRole('video', undefined, { timeout: 5000 });
    expect(videos.length).toBe(2);

    fireEvent.click(screen.getByRole('refresh'));

    const loading = await screen.findByRole('spinner');
    expect(loading).toBeInTheDocument();

    const reloadedVideos = await screen.findAllByRole('video', undefined, { timeout: 5000 });
    expect(reloadedVideos.length).toBe(2);
  }, 60000);
});

const IntegrationTokens = {
  cacheBuster: new DataStoreToken('cacheBuster'),
};

class BumpIntegrationTimestamp implements IRelayCommand {
  constructor(
    @injectDataCache(IntegrationTokens.cacheBuster.key) private readonly cache: DataCache<IntegrationExtensions>,
  ) {}

  async execute(): Promise<void> {
    await this.cache.reset('timestamp');
  }
}

type IntegrationExtensions = {
  timestamp: number;
};

class IntegrationExtensionsDataModule implements DataCatalogRegistration {
  defineData(): DataCatalogRegistrations {
    const cache = configureDataCache<IntegrationExtensions>(IntegrationTokens.cacheBuster, {
      timestamp: {
        source: new ConfiguredDataSource(async () => Date.now()),
        defaultValue: 0,
      },
    });

    return {
      caches: [cache],
    };
  }
}

const withIntegrationExtensions = createDataModule(IntegrationExtensionsDataModule);

type AppProps = {
  container: IServiceContainer;
} & PropsWithChildren;

const IntegrationProvider: React.FC<AppProps> = ({ container, children }) => {
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
