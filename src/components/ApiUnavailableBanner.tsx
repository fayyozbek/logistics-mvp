import { useEffect, useState } from 'react';
import { API_UNAVAILABLE_MESSAGE, isApiConfigured } from '../api';
import { subscribeApiReadError } from '../api/apiReadStatus';
import type { ApiError } from '../api/client';

export default function ApiUnavailableBanner() {
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (!isApiConfigured()) return undefined;
    return subscribeApiReadError(setError);
  }, []);

  if (!isApiConfigured() || !error) {
    return null;
  }

  return (
    <div
      role="alert"
      style={{
        margin: '0 28px 12px',
        padding: '12px 16px',
        borderRadius: 12,
        background: '#FEF2F2',
        border: '1px solid #FECACA',
        color: '#991B1B',
        fontSize: 13,
        fontWeight: 700,
        lineHeight: 1.45,
      }}
    >
      {API_UNAVAILABLE_MESSAGE}
      {error.message && error.message !== API_UNAVAILABLE_MESSAGE && (
        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: '#B91C1C' }}>
          {error.message}
        </div>
      )}
    </div>
  );
}
