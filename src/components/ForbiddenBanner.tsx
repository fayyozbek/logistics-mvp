interface ForbiddenBannerProps {
  message: string;
  onDismiss: () => void;
}

export default function ForbiddenBanner({ message, onDismiss }: ForbiddenBannerProps) {
  return (
    <div style={{
      background: '#FEF3C7',
      borderBottom: '1px solid #FDE68A',
      padding: '10px 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 13, color: '#92400E', fontWeight: 500 }}>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        style={{
          border: 'none',
          background: 'transparent',
          color: '#92400E',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Закрыть
      </button>
    </div>
  );
}
