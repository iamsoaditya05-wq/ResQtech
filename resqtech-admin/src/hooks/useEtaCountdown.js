import { useState, useEffect } from 'react';

/**
 * Returns a live countdown string for an emergency's ETA.
 * Counts down from eta_minutes based on created_at timestamp.
 */
export function useEtaCountdown(emergency) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!emergency?.eta_minutes || !emergency?.created_at) {
      setRemaining(null);
      return;
    }

    function calc() {
      const elapsedMs  = Date.now() - new Date(emergency.created_at).getTime();
      const totalMs    = emergency.eta_minutes * 60 * 1000;
      const remainMs   = totalMs - elapsedMs;

      if (remainMs <= 0) {
        setRemaining('Arriving');
        return;
      }

      const mins = Math.floor(remainMs / 60000);
      const secs = Math.floor((remainMs % 60000) / 1000);
      setRemaining(`${mins}:${String(secs).padStart(2, '0')}`);
    }

    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [emergency?.eta_minutes, emergency?.created_at]);

  return remaining;
}
