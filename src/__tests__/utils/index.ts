/* eslint-disable @typescript-eslint/no-explicit-any */
export async function waitUntil(predicate: () => Promise<boolean>, nrRetries = 3): Promise<void> {
  const interval = 250;
  let count = 0;
  function innerWait(resolve: () => void, reject: (reason?: any) => void) {
    setTimeout(async () => {
      if (await predicate()) {
        resolve();
        return;
      }

      ++count;
      if (count > nrRetries) {
        reject(new Error('Exceeded retry count'));
        return;
      }

      setTimeout(() => innerWait(resolve, reject), interval);
    }, interval);
  }

  return new Promise((resolve, reject) => {
    innerWait(resolve, reject);
  });
}

export async function wait(time: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}
