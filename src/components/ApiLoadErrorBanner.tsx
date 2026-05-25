export default function ApiLoadErrorBanner({ message }: { message: string }) {
  return (
    <div style={{
      margin: '24px 28px',
      padding: '14px 16px',
      borderRadius: 10,
      background: '#FEF2F2',
      border: '1px solid #FECACA',
      color: '#B91C1C',
      fontSize: 13,
      fontWeight: 600,
      lineHeight: 1.45,
    }}>
      {message}
    </div>
  );
}
