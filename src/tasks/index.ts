import { BehaviorSubject, firstValueFrom } from 'rxjs';

const activeTasks = new BehaviorSubject(0);

export async function wait(timeout: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
}

export interface WaitOptions {
  timeoutInMilliseconds: number;
  millisecondPolling: number;
}

const DefaultWaitOptions: WaitOptions = {
  millisecondPolling: 100,
  timeoutInMilliseconds: 5000,
};

export async function waitUntil(
  predicate: () => Promise<boolean>,
  options: WaitOptions = DefaultWaitOptions,
): Promise<boolean> {
  const now = new Date().getTime();
  return await until(predicate, now, options);
}

async function until(predicate: () => Promise<boolean>, time: number, options: WaitOptions): Promise<boolean> {
  let elapsedMilliseconds = new Date().getTime() - time;
  while (elapsedMilliseconds < options.timeoutInMilliseconds) {
    await wait(options.millisecondPolling);
    if (await predicate()) {
      return true;
    }

    elapsedMilliseconds = new Date().getTime() - time;
  }

  return false;
}

export async function runTask(task: () => Promise<void>): Promise<void> {
  try {
    activeTasks.next(activeTasks.value + 1);
    await task();
  } finally {
    activeTasks.next(activeTasks.value - 1);
  }
}

export async function waitForTasksToComplete(options: WaitOptions = DefaultWaitOptions): Promise<void> {
  const result = await waitUntil(async () => {
    const nrTasks = await firstValueFrom(activeTasks);
    return nrTasks === 0;
  }, options);

  if (!result) {
    throw new Error(
      `Tasks did not complete within the specified timeout of ${options.timeoutInMilliseconds} milliseconds`,
    );
  }
}
