import { createContainer, IServiceContainer } from "@aesop-fables/containr";
import { useDataCache } from "../../../src";
import { withVideoDataModule } from "./videos/videoDataModule";

export function bootstrap(): IServiceContainer {
  return createContainer([
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDataCache([withVideoDataModule])
  ]);
}