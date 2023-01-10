import { useState } from 'react';

export default function useBusy(): [boolean, () => () => void] {
  const [busy, setBusy] = useState(false);

  function busyBeginFn() {
    setBusy(true);
    return () => {
      setBusy(false);
    };
  }

  return [busy, busyBeginFn];
}
