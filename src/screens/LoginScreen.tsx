import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DisclaimerFooter from '../components/DisclaimerFooter';
import { useAuthStore } from '../stores/authStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const signIn = useAuthStore((s) => s.signIn);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    setError('');
    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      setError(err.message ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <form className="page-content" onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h1 className="center" style={{ color: '#1565C0' }}>CareLoop</h1>
        <p className="center subtitle" style={{ marginBottom: 36 }}>Caregiver check-in made simple</p>

        {error && <p style={{ color: '#C62828', textAlign: 'center', marginBottom: 12 }}>{error}</p>}

        <label className="form-label">Email</label>
        <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />

        <label className="form-label">Password</label>
        <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" />

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
        <button className="btn btn-outline" type="button" onClick={() => navigate('/signup')}>
          Create Account
        </button>
      </form>
      <DisclaimerFooter />
    </div>
  );
}
