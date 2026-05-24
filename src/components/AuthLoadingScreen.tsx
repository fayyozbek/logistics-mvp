export default function AuthLoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F0F2F8',
      gap: 16,
    }}>
      <div style={{
        width: 34,
        height: 34,
        borderRadius: 8,
        background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
        color: '#fff',
        fontWeight: 700,
      }}>
        L
      </div>
      <div style={{ color: '#64748B', fontSize: 14 }}>Проверка авторизации…</div>
    </div>
  );
}
