import { AutoResolver, Newable } from '@aesop-fables/containr';
import { useServiceContainer } from '@aesop-fables/containr-react';
import { IListener } from '../IListener';
import { useEffect } from 'react';

export function useListener(constructor: Newable<IListener>) {
  const container = useServiceContainer();
  const listener = AutoResolver.resolve(constructor, container);

  return useEffect(() => {
    const subscription = listener.start();

    return () => {
      subscription.unsubscribe();
      if (listener.stop) {
        listener.stop();
      }
    };
  }, []);
}
