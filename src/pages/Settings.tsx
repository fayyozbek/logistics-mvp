import DemoPrototypeBanner from '../components/DemoPrototypeBanner';

export default function Settings() {
  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <DemoPrototypeBanner message="Прототип настроек компании. Сохранение через API будет добавлено позже." />
      <div style={{ background: '#fff', borderRadius: 12, padding: '24px', border: '1px solid #E2E8F0', maxWidth: 600 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 18 }}>Профиль компании</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Название компании', value: 'Logistix Kazakhstan LLP' },
            { label: 'БИН / ИНН', value: '240740012345' },
            { label: 'Email', value: 'ops@logistix.kz' },
            { label: 'Телефон', value: '+7 727 300 0000' },
            { label: 'Страна', value: 'Казахстан' },
            { label: 'Город', value: 'Алматы' },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>{f.label}</div>
              <input
                defaultValue={f.value}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, color: '#0F172A', background: '#F8FAFC', outline: 'none' }}
              />
            </div>
          ))}
        </div>
        <button disabled title="Сохранение настроек через API будет доступно в следующей версии" style={{ marginTop: 16, padding: '10px 24px', background: '#94A3B8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'not-allowed', opacity: 0.7 }}>
          Сохранить изменения
        </button>
      </div>
    </div>
  );
}
