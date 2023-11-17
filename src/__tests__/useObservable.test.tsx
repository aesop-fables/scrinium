import 'reflect-metadata';
import React, { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { BehaviorSubject, NEVER, Observable, map, switchMap } from 'rxjs';
import { useObservable } from '../hooks';

declare type SampleComponentProps<T> = {
  subject: Observable<T>;
  timeout?: number;
};

function SampleComponent<T>(props: SampleComponentProps<T>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [err, onError] = useState<any>();
  const value = useObservable(props.subject, {
    onError,
    timeout: props.timeout,
  });
  return <p>{JSON.stringify(err?.message ?? value)}</p>;
}

describe('useObservable', () => {
  test('Publishes the value', async () => {
    let latch = true;
    const subject = new BehaviorSubject<string>('');
    const subject$ = subject.pipe(
      switchMap((x) => {
        if (latch) {
          return NEVER;
        }

        return subject;
      }),
    );

    render(<SampleComponent<string> subject={subject$} />);

    await act(async () => {
      latch = false;
      subject.next('Hello, World!');
    });

    await waitFor(() => screen.getByText(/Hello, World!/i));
  });

  test('Invokes the error callback', async () => {
    const subject = new BehaviorSubject<string>('');
    const subject$ = subject.pipe(
      map((x) => {
        if (x === 'trigger') {
          throw new Error('Triggered');
        }

        return x;
      }),
    );

    render(<SampleComponent<string> subject={subject$} />);

    await act(async () => {
      subject.next('trigger');
    });

    await waitFor(() => screen.getByText(/Triggered/i));
  });

  test('Timing out calls the error callback', async () => {
    let latch = true;
    const subject = new BehaviorSubject<string>('');
    const subject$ = subject.pipe(
      switchMap((x) => {
        if (latch) {
          return NEVER;
        }

        return subject;
      }),
    );

    render(<SampleComponent<string> subject={subject$} timeout={250} />);

    await act(async () => {
      setTimeout(() => {
        latch = false;
        subject.next('Test');
      }, 500);
    });

    await waitFor(() => screen.getByText(/Timeout has occurred/i));
  });
});
