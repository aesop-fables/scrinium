// eslint-disable testing-library/no-node-access
import { ServiceCollection } from '@aesop-fables/containr';
import { ServiceProvider } from '@aesop-fables/containr-react';
import React from 'react';
import { DataCacheServices, IAppStorage } from '..';

export interface InteractionContextProps {
  appStorage: IAppStorage;
  children: JSX.Element;
}

export const InteractionContext: React.FC<InteractionContextProps> = ({ appStorage, ...props }) => {
  const services = new ServiceCollection();
  services.register<IAppStorage>(DataCacheServices.AppStorage, appStorage);
  const container = services.buildContainer();

  return <ServiceProvider rootContainer={container}>{props.children}</ServiceProvider>;
};
