import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DisclaimerFooter from '../components/DisclaimerFooter';
import { useAuthStore } from '../stores/authStore';

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'caregiver' | 'family'>('caregiver');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const signUp = useAuthStore((s) => s.signUp);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    setError('');
    try {
      await signUp(email.trim(), password, fullName.trim(), role);
    } catch (err: any) {
      setError(err.message ?? 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <form className="page-content" onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h1 className="center" style={{ color: '#1565C0', fontSize: 30 }}>Create Account</h1>
        <p className="center subtitle" style={{ marginBottom: 24 }}>Set up your CareLoop account</p>

        <label className="form-label">I am a...</label>
        <div className="yesno-buttons" style={{ marginBottom: 12 }}>
          <button type="button" className={`yesno-btn ${role === 'caregiver' ? 'yes' : ''}`} onClick={() => setRole('caregiver')}>Caregiver</button>
          <button type="button" className={`yesno-btn ${role === 'family' ? 'yes' : ''}`} onClick={() => setRole('family')}>Family Member</button>
        </div>

        {error && <p style={{ color: '#C62828', textAlign: 'center', marginBottom: 12 }}>{error}</p>}

        <label className="form-label">Full Name</label>
        <input className="form-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />

        <label className="form-label">Email</label>
        <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />

        <label className="form-label">Password</label>
        <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" />

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
        <button className="btn btn-outline" type="button" onClick={() => navigate('/')}>
          Back to Sign In
        </button>
      </form>
      <DisclaimerFooter />
    </div>
  );
}
