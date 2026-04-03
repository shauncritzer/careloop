import { useState } from 'react';
import DisclaimerFooter from '../components/DisclaimerFooter';
import { useAuthStore } from '../stores/authStore';
import { usePatientStore } from '../stores/patientStore';

export default function PatientSetupScreen() {
  const user = useAuthStore((s) => s.user);
  const createPatient = usePatientStore((s) => s.createPatient);

  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [weight, setWeight] = useState('');
  const [sysBp, setSysBp] = useState('');
  const [diaBp, setDiaBp] = useState('');
  const [pulse, setPulse] = useState('');
  const [spo2, setSpo2] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [familyContact, setFamilyContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter the patient name.'); return; }
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      await createPatient({
        owner_user_id: user.id,
        name: name.trim(),
        date_of_birth: dob || null,
        baseline_weight_lbs: weight ? parseFloat(weight) : null,
        baseline_sys_bp: sysBp ? parseInt(sysBp) : null,
        baseline_dia_bp: diaBp ? parseInt(diaBp) : null,
        baseline_pulse: pulse ? parseInt(pulse) : null,
        baseline_spo2: spo2 ? parseInt(spo2) : null,
        caregiver_name: caregiverName || null,
        family_contact_name: familyContact || null,
      });
    } catch (err: any) {
      setError(err.message ?? 'Could not save patient profile.');
    } finally {
      setLoading(false);
    }
  };

  const field = (label: string, value: string, setter: (v: string) => void, placeholder: string, type = 'text') => (
    <>
      <label className="form-label">{label}</label>
      <input className="form-input" type={type} inputMode={type === 'number' ? 'numeric' : undefined} value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder} />
    </>
  );

  return (
    <div className="page">
      <form className="page-content" onSubmit={handleSave}>
        <h1 className="center" style={{ color: '#1565C0', fontSize: 28 }}>Patient Profile</h1>
        <p className="center subtitle" style={{ marginBottom: 24 }}>Enter baseline information. You can update these later.</p>

        {error && <p style={{ color: '#C62828', textAlign: 'center', marginBottom: 12 }}>{error}</p>}

        {field('Patient Name *', name, setName, 'Full name')}
        {field('Date of Birth', dob, setDob, 'YYYY-MM-DD')}
        {field('Baseline Weight (lbs)', weight, setWeight, 'e.g. 185', 'number')}
        {field('Baseline Systolic BP', sysBp, setSysBp, 'e.g. 130', 'number')}
        {field('Baseline Diastolic BP', diaBp, setDiaBp, 'e.g. 80', 'number')}
        {field('Baseline Pulse', pulse, setPulse, 'e.g. 72', 'number')}
        {field('Baseline SpO2 (%)', spo2, setSpo2, 'e.g. 96', 'number')}
        {field('Caregiver Name', caregiverName, setCaregiverName, 'Your name')}
        {field('Family Contact Name', familyContact, setFamilyContact, 'e.g. Son, Daughter')}

        <button className="btn btn-green" type="submit" disabled={loading} style={{ marginTop: 20 }}>
          {loading ? 'Saving...' : 'Save & Continue'}
        </button>
      </form>
      <DisclaimerFooter />
    </div>
  );
}
