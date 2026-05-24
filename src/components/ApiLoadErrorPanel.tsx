import { API_UNAVAILABLE_MESSAGE } from '../api';

interface ApiLoadErrorPanelProps {
  message?: string;
}

export default function ApiLoadErrorPanel({ message }: ApiLoadErrorPanelProps) {
  return (
    <div style={{ padding: '22px 28px' }}>
      <div
        role="alert"
        style={{
          padding: '16px 18px',
          borderRadius: 14,
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          color: '#991B1B',
          fontSize: 14,
          fontWeight: 700,
          lineHeight: 1.5,
        }}
      >
        {message ?? API_UNAVAILABLE_MESSAGE}
      </div>
    </div>
  );
}
