import { useServiceContainer } from '@aesop-fables/containr-react';
import { ICommandExecutor } from '../commands/ICommandExecutor';
import { ScriniumServices } from '../ScriniumServices';

export function useCommands() {
  const container = useServiceContainer();
  return container.get<ICommandExecutor>(ScriniumServices.CommandExecutor);
}
