import { useEffect, useState } from 'react';
import { subscribeToSession } from '../services/sessionService.js';

export function useSession(sessionId) {
  const [state, setState] = useState({
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!sessionId) {
      setState({ session: null, loading: false, error: 'Missing session ID.' });
      return undefined;
    }

    setState({ session: null, loading: true, error: null });

    const unsubscribe = subscribeToSession(sessionId, (session, error) => {
      if (error) {
        setState({ session: null, loading: false, error: error.message });
        return;
      }

      setState({ session, loading: false, error: null });
    });

    return unsubscribe;
  }, [sessionId]);

  return state;
}
