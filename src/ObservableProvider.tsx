import React, { useContext, useMemo } from 'react';
import { PropsWithChildren, createContext } from 'react';
import { ObservableOptions } from './hooks';

type ObservableContext = {
  options: ObservableOptions;
};

const ObservableProviderContext = createContext<ObservableContext | undefined>(undefined);

export const ObservableProvider: React.FC<ObservableContext & PropsWithChildren> = ({ children, options }) => {
  const value = useMemo(() => ({ options }), [options]);
  return <ObservableProviderContext.Provider value={value}>{children}</ObservableProviderContext.Provider>;
};

export function useObservableOptions() {
  const context = useContext(ObservableProviderContext);
  return context?.options;
}
