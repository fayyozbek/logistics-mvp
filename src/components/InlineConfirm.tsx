import type { ReactNode } from 'react';
import FormErrorList from './FormErrorList';

type InlineConfirmProps = {
  message: ReactNode;
  confirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  errors?: string[];
  marginBottom?: number;
  confirmLabel?: string;
  confirmingLabel?: string;
};

export default function InlineConfirm({
  message,
  confirming,
  onCancel,
  onConfirm,
  errors = [],
  marginBottom = 14,
  confirmLabel = 'Да, удалить',
  confirmingLabel = 'Удаление...',
}: InlineConfirmProps) {
  return (
    <div
      style={{
        padding: '12px',
        borderRadius: 10,
        background: '#FEF2F2',
        border: '1px solid #FECACA',
        marginBottom,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: '#991B1B', marginBottom: 8 }}>
        {message}
      </div>
      <FormErrorList errors={errors} marginBottom={errors.length > 0 ? 8 : 0} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={confirming}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #E2E8F0',
            background: '#fff',
            fontSize: 12,
          }}
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: 'none',
            background: confirming ? '#94A3B8' : '#DC2626',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {confirming ? confirmingLabel : confirmLabel}
        </button>
      </div>
    </div>
  );
}
