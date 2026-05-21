type PageLoadingProps = {
  padding?: string;
  className?: string;
  accentColor?: string;
};

export default function PageLoading({
  padding = '20px 28px',
  className,
  accentColor = '#2563EB',
}: PageLoadingProps) {
  return (
    <div
      className={className}
      style={{
        padding,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: '#8B95A7',
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: '2.5px solid #E2E8F0',
          borderTopColor: accentColor,
          animation: 'spin 0.7s linear infinite',
        }}
      />
      Загрузка...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
