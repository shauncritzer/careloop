import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DisclaimerFooter from '../components/DisclaimerFooter';
import { usePatientStore } from '../stores/patientStore';

function generateSummary(patientName: string, logs: any[]): string {
  if (logs.length === 0) return 'No daily logs recorded in the past 7 days.';
  const sorted = [...logs].sort((a, b) => a.log_date.localeCompare(b.log_date));
  const first = sorted[0].log_date;
  const last = sorted[sorted.length - 1].log_date;

  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const range = `${fmt(first)}\u2013${fmt(last)}`;

  const weights = sorted.map((l: any) => l.weight_lbs).filter((w: any) => w != null);
  let weightStr = 'Weight not recorded.';
  if (weights.length > 0) {
    const minW = Math.min(...weights), maxW = Math.max(...weights);
    const change = weights[weights.length - 1] - weights[0];
    const dir = change > 0 ? 'up' : change < 0 ? 'down' : 'unchanged';
    weightStr = `Weight ranged from ${minW}\u2013${maxW} lbs, ${dir} ${Math.abs(change).toFixed(1)} lbs overall.`;
  }

  const bps = sorted.filter((l: any) => l.systolic_bp != null && l.diastolic_bp != null);
  let bpStr = 'Blood pressure not recorded.';
  if (bps.length > 0) {
    const avgSys = Math.round(bps.reduce((s: number, l: any) => s + l.systolic_bp, 0) / bps.length);
    const avgDia = Math.round(bps.reduce((s: number, l: any) => s + l.diastolic_bp, 0) / bps.length);
    bpStr = `Blood pressure averaged ${avgSys}/${avgDia}.`;
  }

  const o2s = sorted.map((l: any) => l.spo2).filter((v: any) => v != null);
  let o2Str = 'Oxygen not recorded.';
  if (o2s.length > 0) o2Str = `Oxygen ${Math.min(...o2s)}\u2013${Math.max(...o2s)}%.`;

  const symptomKeys = [
    { key: 'breathing_worse', label: 'breathing worse' }, { key: 'mild_confusion', label: 'mild confusion' },
    { key: 'severe_confusion', label: 'severe confusion' }, { key: 'swelling', label: 'swelling' },
    { key: 'poor_sleep', label: 'poor sleep' }, { key: 'stomach_pain_bent_over', label: 'stomach pain' },
    { key: 'weak_exhausted', label: 'weakness/exhaustion' }, { key: 'poor_appetite', label: 'poor appetite' },
    { key: 'cough_worse', label: 'worsening cough' }, { key: 'fall_or_near_fall', label: 'fall or near-fall' },
  ];
  const notes: string[] = [];
  for (const { key, label } of symptomKeys) {
    const count = sorted.filter((l: any) => l[key]).length;
    if (count > 0) notes.push(`${label} noted on ${count} day${count > 1 ? 's' : ''}`);
  }
  const symptomStr = notes.length > 0 ? notes.join('. ') + '.' : 'No symptoms reported.';

  const lasixMissed = sorted.filter((l: any) => l.lasix_taken === false).length;
  const medsMissed = sorted.filter((l: any) => l.all_meds_taken === false).length;
  let medStr = 'All medications taken as prescribed.';
  if (lasixMissed > 0 || medsMissed > 0) {
    const parts: string[] = [];
    if (lasixMissed > 0) parts.push(`Lasix missed ${lasixMissed} time${lasixMissed > 1 ? 's' : ''}`);
    if (medsMissed > 0) parts.push(`other medications missed ${medsMissed} time${medsMissed > 1 ? 's' : ''}`);
    medStr = parts.join('. ') + '.';
  }

  const falls = sorted.filter((l: any) => l.fall_or_near_fall).length;
  const fallStr = falls > 0 ? `${falls} fall/near-fall reported.` : 'No falls reported.';

  return `${patientName} \u2014 Past 7 days (${range}):\n\n${weightStr}\n${bpStr}\n${o2Str}\n\n${symptomStr}\n\n${medStr}\n${fallStr}`;
}

export default function DoctorSummaryScreen() {
  const { patient, recentLogs } = usePatientStore();
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const summary = generateSummary(patient?.name ?? 'Patient', recentLogs);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="page">
      <div className="page-content">
        <h1 className="center" style={{ fontSize: 26 }}>Doctor Summary</h1>
        <p className="center subtitle" style={{ marginBottom: 20 }}>7-day summary for the care team</p>

        <div className="summary-box">{summary}</div>

        <button className="btn btn-purple" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>Back to Home</button>
      </div>
      <DisclaimerFooter />
    </div>
  );
}
