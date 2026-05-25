interface DemoPrototypeBannerProps {
  message?: string;
}

export default function DemoPrototypeBanner({
  message = 'Прототип / демо-данные. Раздел не подключён к API.',
}: DemoPrototypeBannerProps) {
  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: 10,
      background: '#FFFBEB',
      border: '1px solid #FDE68A',
      color: '#92400E',
      fontSize: 12,
      fontWeight: 600,
    }}>
      {message}
    </div>
  );
}
