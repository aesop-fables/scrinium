import { useMemo } from 'react';
import { IApplicationState } from '../ApplicationState';
import { ScriniumServices } from '../ScriniumServices';
import { useSubject } from './useSubject';

export function useApplicationState() {
  const state = useSubject<IApplicationState>(ScriniumServices.ApplicationState);
  return useMemo(() => state ?? { compartments: [] }, [state]);
}
