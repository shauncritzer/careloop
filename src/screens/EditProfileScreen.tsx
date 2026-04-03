import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DisclaimerFooter from '../components/DisclaimerFooter';
import { usePatientStore } from '../stores/patientStore';

export default function EditProfileScreen() {
  const { patient, updatePatient } = usePatientStore();
  const navigate = useNavigate();

  const [name, setName] = useState(patient?.name ?? '');
  const [dob, setDob] = useState(() => {
    if (!patient?.date_of_birth) return '';
    // Convert YYYY-MM-DD to MM-DD-YYYY for display
    const m = patient.date_of_birth.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[2]}-${m[3]}-${m[1]}` : patient.date_of_birth;
  });
  const [weight, setWeight] = useState(patient?.baseline_weight_lbs?.toString() ?? '');
  const [sysBp, setSysBp] = useState(patient?.baseline_sys_bp?.toString() ?? '');
  const [diaBp, setDiaBp] = useState(patient?.baseline_dia_bp?.toString() ?? '');
  const [pulse, setPulse] = useState(patient?.baseline_pulse?.toString() ?? '');
  const [spo2, setSpo2] = useState(patient?.baseline_spo2?.toString() ?? '');
  const [caregiverName, setCaregiverName] = useState(patient?.caregiver_name ?? '');
  const [familyContact, setFamilyContact] = useState(patient?.family_contact_name ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  if (!patient) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter the patient name.'); return; }
    setLoading(true);
    setError('');
    setSaved(false);
    try {
      await updatePatient(patient.id, {
        name: name.trim(),
        date_of_birth: dob ? dob.replace(/^(\d{2})-(\d{2})-(\d{4})$/, '$3-$1-$2') : null,
        baseline_weight_lbs: weight ? parseFloat(weight) : null,
        baseline_sys_bp: sysBp ? parseInt(sysBp) : null,
        baseline_dia_bp: diaBp ? parseInt(diaBp) : null,
        baseline_pulse: pulse ? parseInt(pulse) : null,
        baseline_spo2: spo2 ? parseInt(spo2) : null,
        caregiver_name: caregiverName || null,
        family_contact_name: familyContact || null,
      });
      setSaved(true);
    } catch (err: any) {
      setError(err.message ?? 'Could not save changes.');
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
        <h1 className="center" style={{ color: '#1565C0', fontSize: 26 }}>Edit Patient Profile</h1>
        <p className="center subtitle" style={{ marginBottom: 20 }}>Update baseline information</p>

        {error && <p style={{ color: '#C62828', textAlign: 'center', marginBottom: 12 }}>{error}</p>}
        {saved && <p style={{ color: '#2E7D32', textAlign: 'center', marginBottom: 12 }}>Saved successfully!</p>}

        {field('Patient Name *', name, setName, 'Full name')}
        {field('Date of Birth', dob, setDob, 'MM-DD-YYYY')}
        {field('Baseline Weight (lbs)', weight, setWeight, 'e.g. 185', 'number')}
        {field('Baseline Systolic BP', sysBp, setSysBp, 'e.g. 130', 'number')}
        {field('Baseline Diastolic BP', diaBp, setDiaBp, 'e.g. 80', 'number')}
        {field('Baseline Pulse', pulse, setPulse, 'e.g. 72', 'number')}
        {field('Baseline SpO2 (%)', spo2, setSpo2, 'e.g. 96', 'number')}
        {field('Caregiver Name', caregiverName, setCaregiverName, 'Your name')}
        {field('Family Contact Name', familyContact, setFamilyContact, 'e.g. Son, Daughter')}

        <button className="btn btn-green" type="submit" disabled={loading} style={{ marginTop: 20 }}>
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => navigate('/')}>
          Back to Home
        </button>
      </form>
      <DisclaimerFooter />
    </div>
  );
}
