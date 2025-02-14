// eslint-disable testing-library/no-node-access
import { Scopes, ServiceCollection, createContainer, createServiceModule } from '@aesop-fables/containr';
import { ServiceProvider } from '@aesop-fables/containr-react';
import React from 'react';
import { ScriniumServices, DataStore, ISubjectResolver, SubjectResolver } from '..';

export interface InteractionContextProps {
  dataStore?: DataStore;
  children: JSX.Element;
  configureServices?: (services: ServiceCollection) => void;
}

export const InteractionContext: React.FC<InteractionContextProps> = ({ dataStore, ...props }) => {
  const interactionServices = createServiceModule('interactionContext', (services) => {
    if (dataStore) {
      services.singleton<DataStore>(ScriniumServices.DataStore, dataStore);
    }

    services.autoResolve<ISubjectResolver>(ScriniumServices.SubjectResolver, SubjectResolver, Scopes.Transient);

    if (props.configureServices) {
      props.configureServices(services);
    }
  });

  const container = createContainer([interactionServices]);

  return <ServiceProvider rootContainer={container}>{props.children}</ServiceProvider>;
};
