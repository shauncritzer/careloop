import { Severity } from '../lib/alertEngine';

const LABELS: Record<Severity, string> = {
  green: 'All Good',
  yellow: 'Monitor Closely',
  red: 'Action Needed',
};

interface Props {
  severity: Severity;
  messages: string[];
}

export default function StatusCard({ severity, messages }: Props) {
  return (
    <div className={`status-card ${severity}`}>
      <h3>{LABELS[severity]}</h3>
      {messages.map((msg, i) => (
        <p key={i}>{msg}</p>
      ))}
    </div>
  );
}
