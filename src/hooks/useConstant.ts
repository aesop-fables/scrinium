import React, { useEffect } from 'react';

type ResultBox<T> = { v: T };

export default function useConstant<T>(fn: () => T): T {
  const ref = React.useRef<ResultBox<T>>();

  if (!ref.current) {
    ref.current = { v: fn() };
  }

  return ref.current.v;
}

export interface Disposable {
  dispose(): void;
}

export function useDisposableConstant<T extends Disposable>(fn: () => T, destructor?: () => void): T {
  const c = useConstant<T>(fn);

  useEffect(() => {
    return () => {
      if (destructor) {
        destructor();
      }

      c.dispose();
    };
  }, []); // the effect only runs once

  return c;
}
