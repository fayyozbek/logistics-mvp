type FormErrorListProps = {
  errors: string[];
  marginBottom?: number;
  fontSize?: number;
  padding?: string;
};

export default function FormErrorList({
  errors,
  marginBottom = 12,
  fontSize = 12,
  padding = '10px 12px',
}: FormErrorListProps) {
  if (errors.length === 0) return null;

  return (
    <div
      style={{
        padding,
        borderRadius: 8,
        background: '#FEF2F2',
        border: '1px solid #FECACA',
        color: '#B91C1C',
        fontSize,
        marginBottom,
      }}
    >
      {errors.map((error) => (
        <div key={error}>{error}</div>
      ))}
    </div>
  );
}
