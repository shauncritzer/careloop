import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusCard from '../components/StatusCard';
import DisclaimerFooter from '../components/DisclaimerFooter';
import { useAuthStore } from '../stores/authStore';
import { usePatientStore } from '../stores/patientStore';
import { evaluateAlerts, AlertResult } from '../lib/alertEngine';
import { supabase } from '../lib/supabase';

const SYMPTOM_LIST = [
  { key: 'breathing_worse', label: 'Breathing Worse' },
  { key: 'mild_confusion', label: 'Mild Confusion' },
  { key: 'severe_confusion', label: 'Severe Confusion' },
  { key: 'stomach_pain_bent_over', label: 'Stomach Pain / Bent Over' },
  { key: 'swelling', label: 'Swelling' },
  { key: 'poor_sleep', label: 'Poor Sleep' },
  { key: 'weak_exhausted', label: 'Weak / Exhausted' },
  { key: 'poor_appetite', label: 'Poor Appetite' },
  { key: 'cough_worse', label: 'Cough Worse' },
  { key: 'fall_or_near_fall', label: 'Fall or Near-Fall' },
] as const;

type SymptomKey = (typeof SYMPTOM_LIST)[number]['key'];

function YesNo({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="yesno-row">
      <div className="yesno-label">{label}</div>
      <div className="yesno-buttons">
        <button type="button" className={`yesno-btn ${value === true ? 'yes' : ''}`} onClick={() => onChange(true)}>Yes</button>
        <button type="button" className={`yesno-btn ${value === false ? 'no' : ''}`} onClick={() => onChange(false)}>No</button>
      </div>
    </div>
  );
}

export default function DailyCheckInScreen() {
  const user = useAuthStore((s) => s.user);
  const { patient, recentLogs, saveDailyLog, todayLog } = usePatientStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [alertResult, setAlertResult] = useState<AlertResult | null>(null);

  const [weight, setWeight] = useState(todayLog?.weight_lbs?.toString() ?? '');
  const [sysBp, setSysBp] = useState(todayLog?.systolic_bp?.toString() ?? '');
  const [diaBp, setDiaBp] = useState(todayLog?.diastolic_bp?.toString() ?? '');
  const [pulse, setPulse] = useState(todayLog?.pulse_bpm?.toString() ?? '');
  const [spo2, setSpo2] = useState(todayLog?.spo2?.toString() ?? '');
  const [symptoms, setSymptoms] = useState<Record<SymptomKey, boolean>>({
    breathing_worse: todayLog?.breathing_worse ?? false,
    mild_confusion: todayLog?.mild_confusion ?? false,
    severe_confusion: todayLog?.severe_confusion ?? false,
    stomach_pain_bent_over: todayLog?.stomach_pain_bent_over ?? false,
    swelling: todayLog?.swelling ?? false,
    poor_sleep: todayLog?.poor_sleep ?? false,
    weak_exhausted: todayLog?.weak_exhausted ?? false,
    poor_appetite: todayLog?.poor_appetite ?? false,
    cough_worse: todayLog?.cough_worse ?? false,
    fall_or_near_fall: todayLog?.fall_or_near_fall ?? false,
  });
  const [lasixTaken, setLasixTaken] = useState<boolean | null>(todayLog?.lasix_taken ?? null);
  const [allMedsTaken, setAllMedsTaken] = useState<boolean | null>(todayLog?.all_meds_taken ?? null);
  const [ambienTaken, setAmbienTaken] = useState<boolean | null>(todayLog?.ambien_taken_last_night ?? null);
  const [medNote, setMedNote] = useState(todayLog?.med_note ?? '');
  const [generalNote, setGeneralNote] = useState(todayLog?.general_note ?? '');

  const toggleSymptom = (key: SymptomKey) => setSymptoms((p) => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    if (!patient || !user) return;
    setSaving(true);
    const today = new Date().toISOString().split('T')[0];
    const logData = {
      patient_id: patient.id, log_date: today,
      weight_lbs: weight ? parseFloat(weight) : null,
      systolic_bp: sysBp ? parseInt(sysBp) : null,
      diastolic_bp: diaBp ? parseInt(diaBp) : null,
      pulse_bpm: pulse ? parseInt(pulse) : null,
      spo2: spo2 ? parseInt(spo2) : null,
      ...symptoms,
      lasix_taken: lasixTaken, all_meds_taken: allMedsTaken,
      ambien_taken_last_night: ambienTaken,
      med_note: medNote || null, general_note: generalNote || null,
      created_by_user_id: user.id,
    };
    try {
      const saved = await saveDailyLog(logData);
      const yesterdayLog = recentLogs.find((l) => {
        const d = new Date(); d.setDate(d.getDate() - 1);
        return l.log_date === d.toISOString().split('T')[0];
      });
      const sevenDayLog = recentLogs.find((l) => {
        const d = new Date(); d.setDate(d.getDate() - 7);
        return l.log_date === d.toISOString().split('T')[0];
      });
      const result = evaluateAlerts(logData as any, {
        baseline_weight_lbs: patient.baseline_weight_lbs,
        baseline_sys_bp: patient.baseline_sys_bp,
        baseline_dia_bp: patient.baseline_dia_bp,
        baseline_pulse: patient.baseline_pulse,
        baseline_spo2: patient.baseline_spo2,
      }, {
        yesterdayWeight: yesterdayLog?.weight_lbs ?? null,
        weightSevenDaysAgo: sevenDayLog?.weight_lbs ?? null,
        poorSleepYesterday: yesterdayLog?.poor_sleep ?? false,
      });
      await supabase.from('alerts').insert({
        patient_id: patient.id, daily_log_id: saved.id,
        severity: result.severity, message: result.messages.join(' '),
      });
      setAlertResult(result);
      setStep(6);
    } catch (err: any) {
      alert('Error saving: ' + (err.message ?? 'Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const cards = [
    <div key="weight" className="card">
      <h2>Weight</h2>
      <p className="desc">Enter today's weight in pounds</p>
      <input className="form-input form-input-big" type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 188" />
      <p className="unit">lbs</p>
    </div>,

    <div key="bp" className="card">
      <h2>Blood Pressure & Pulse</h2>
      <p className="desc">Systolic / Diastolic</p>
      <div className="row">
        <input className="form-input form-input-big" type="number" inputMode="numeric" value={sysBp} onChange={(e) => setSysBp(e.target.value)} placeholder="Sys" />
        <span className="slash">/</span>
        <input className="form-input form-input-big" type="number" inputMode="numeric" value={diaBp} onChange={(e) => setDiaBp(e.target.value)} placeholder="Dia" />
      </div>
      <p className="desc">Pulse (beats per minute)</p>
      <input className="form-input form-input-big" type="number" inputMode="numeric" value={pulse} onChange={(e) => setPulse(e.target.value)} placeholder="e.g. 72" />
    </div>,

    <div key="spo2" className="card">
      <h2>Oxygen Level (SpO2)</h2>
      <p className="desc">From the pulse oximeter</p>
      <input className="form-input form-input-big" type="number" inputMode="numeric" value={spo2} onChange={(e) => setSpo2(e.target.value)} placeholder="e.g. 96" />
      <p className="unit">%</p>
    </div>,

    <div key="symptoms" className="card">
      <h2>Symptoms</h2>
      <p className="desc">Tap any that apply today</p>
      <div className="symptom-grid">
        {SYMPTOM_LIST.map((s) => (
          <button key={s.key} type="button" className={`symptom-btn ${symptoms[s.key] ? 'active' : ''}`} onClick={() => toggleSymptom(s.key)}>
            {s.label}
          </button>
        ))}
      </div>
    </div>,

    <div key="meds" className="card">
      <h2>Medications</h2>
      <YesNo label="Lasix taken today?" value={lasixTaken} onChange={setLasixTaken} />
      <YesNo label="All medications taken?" value={allMedsTaken} onChange={setAllMedsTaken} />
      <YesNo label="Ambien taken last night?" value={ambienTaken} onChange={setAmbienTaken} />
      <p className="desc">Optional medication note</p>
      <input className="form-input" value={medNote} onChange={(e) => setMedNote(e.target.value)} placeholder="Any notes about meds..." />
    </div>,

    <div key="note" className="card">
      <h2>General Note</h2>
      <p className="desc">Anything else to record today?</p>
      <textarea className="form-input" style={{ minHeight: 100, resize: 'vertical' }} value={generalNote} onChange={(e) => setGeneralNote(e.target.value)} placeholder="Optional notes..." />
    </div>,

    alertResult ? (
      <div key="result" className="card">
        <h2 className="center">Today's Status</h2>
        <StatusCard severity={alertResult.severity} messages={alertResult.messages} />
        <button className="btn btn-green" onClick={() => navigate('/')}>Done — Back to Home</button>
      </div>
    ) : null,
  ];

  return (
    <div className="page">
      <div className="page-content">
        <p className="progress">Step {Math.min(step + 1, 6)} of 6</p>
        {cards[step]}

        {step < 5 && (
          <div className="nav-row">
            {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>Back</button>}
            <button className="btn btn-primary" onClick={() => setStep(step + 1)}>Next</button>
          </div>
        )}
        {step === 5 && (
          <button className="btn btn-green" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save & See Results'}
          </button>
        )}
      </div>
      <DisclaimerFooter />
    </div>
  );
}
