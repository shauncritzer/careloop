import { useNavigate } from 'react-router-dom';
import DisclaimerFooter from '../components/DisclaimerFooter';
import { usePatientStore, DailyLog } from '../stores/patientStore';

function MiniChart({ label, data, unit, color }: { label: string; data: { date: string; value: number | null }[]; unit: string; color: string }) {
  const valid = data.filter((d) => d.value != null);
  if (valid.length === 0) {
    return <div className="chart-box"><div className="chart-label">{label}</div><p style={{ color: '#AAA', fontSize: 16 }}>No data recorded</p></div>;
  }
  const values = valid.map((d) => d.value!);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return (
    <div className="chart-box">
      <div className="chart-label">{label}</div>
      <div className="bar-row">
        {data.map((d, i) => {
          if (d.value == null) return (
            <div key={i} className="bar-col">
              <div className="bar" style={{ height: 4, background: '#EEE' }} />
              <span className="bar-date">{d.date.slice(5)}</span>
            </div>
          );
          const range = max - min || 1;
          const height = 20 + ((d.value - min) / range) * 60;
          return (
            <div key={i} className="bar-col">
              <span className="bar-value">{d.value}{unit}</span>
              <div className="bar" style={{ height, background: color }} />
              <span className="bar-date">{d.date.slice(5)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SymptomRow({ logs }: { logs: DailyLog[] }) {
  const keys = ['breathing_worse','mild_confusion','severe_confusion','stomach_pain_bent_over','swelling','poor_sleep','weak_exhausted','poor_appetite','cough_worse','fall_or_near_fall'] as const;
  return (
    <div className="chart-box">
      <div className="chart-label">Symptom Flags</div>
      <div className="symptom-table">
        {logs.map((log, i) => {
          const active = keys.filter((k) => (log as any)[k]);
          return (
            <div key={i} className="symptom-day">
              <span className="bar-date">{log.log_date.slice(5)}</span>
              {active.length === 0 ? <div className="dot dot-green" /> : active.map((_, j) => <div key={j} className="dot dot-red" />)}
              {active.length > 0 && <span className="symptom-count">{active.length}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MedAdherence({ logs }: { logs: DailyLog[] }) {
  return (
    <div className="chart-box">
      <div className="chart-label">Medication Adherence</div>
      <div className="bar-row">
        {logs.map((log, i) => (
          <div key={i} className="bar-col">
            <div className="med-dot" style={{ background: log.lasix_taken === false || log.all_meds_taken === false ? '#FFC107' : '#4CAF50' }} />
            <span className="bar-date">{log.log_date.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TrendsScreen() {
  const { recentLogs, patient } = usePatientStore();
  const navigate = useNavigate();
  const sorted = [...recentLogs].sort((a, b) => a.log_date.localeCompare(b.log_date));

  return (
    <div className="page">
      <div className="page-content">
        <h1 className="center" style={{ fontSize: 26 }}>7-Day Trends</h1>
        <p className="center subtitle" style={{ marginBottom: 16 }}>{patient?.name}</p>

        <MiniChart label="Weight (lbs)" data={sorted.map((l) => ({ date: l.log_date, value: l.weight_lbs }))} unit="" color="#1565C0" />
        <MiniChart label="Systolic BP" data={sorted.map((l) => ({ date: l.log_date, value: l.systolic_bp }))} unit="" color="#D32F2F" />
        <MiniChart label="Pulse (bpm)" data={sorted.map((l) => ({ date: l.log_date, value: l.pulse_bpm }))} unit="" color="#F57C00" />
        <MiniChart label="SpO2 (%)" data={sorted.map((l) => ({ date: l.log_date, value: l.spo2 }))} unit="%" color="#00897B" />
        <SymptomRow logs={sorted} />
        <MedAdherence logs={sorted} />

        <button className="btn btn-ghost" onClick={() => navigate('/')}>Back to Home</button>
      </div>
      <DisclaimerFooter />
    </div>
  );
}
