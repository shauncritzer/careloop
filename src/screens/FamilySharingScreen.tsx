import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DisclaimerFooter from '../components/DisclaimerFooter';
import { usePatientStore } from '../stores/patientStore';

export default function FamilySharingScreen() {
  const { patient, familyMembers, inviteFamily, removeFamily } = usePatientStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await inviteFamily(email.trim());
      setMessage(`Access granted to ${email.trim()}`);
      setEmail('');
    } catch (err: any) {
      setError(err.message ?? 'Could not invite family member.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (accessId: string, name: string) => {
    if (!confirm(`Remove ${name}'s access?`)) return;
    await removeFamily(accessId);
  };

  return (
    <div className="page">
      <div className="page-content">
        <h1 className="center" style={{ fontSize: 26 }}>Family Sharing</h1>
        <p className="center subtitle" style={{ marginBottom: 20 }}>
          Invite family members to view {patient?.name}'s daily status
        </p>

        <div className="card">
          <h2 style={{ fontSize: 20 }}>Invite by Email</h2>
          <p className="desc">
            The family member must create a CareLoop account first, then you can grant them read-only access here.
          </p>

          {error && <p style={{ color: '#C62828', marginBottom: 12 }}>{error}</p>}
          {message && <p style={{ color: '#2E7D32', marginBottom: 12 }}>{message}</p>}

          <form onSubmit={handleInvite}>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="family@example.com"
            />
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Inviting...' : 'Grant Access'}
            </button>
          </form>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 20 }}>Current Family Members</h2>
          {familyMembers.length === 0 ? (
            <p style={{ color: '#888', fontSize: 16 }}>No family members have been invited yet.</p>
          ) : (
            <div>
              {familyMembers.map((m) => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #EEE' }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{m.full_name}</div>
                    <div style={{ fontSize: 14, color: '#888' }}>{m.email}</div>
                  </div>
                  <button
                    onClick={() => handleRemove(m.id, m.full_name)}
                    style={{ background: 'none', border: '1px solid #E57373', color: '#C62828', borderRadius: 8, padding: '8px 14px', fontSize: 14, cursor: 'pointer', minHeight: 40, minWidth: 48 }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="btn btn-ghost" onClick={() => navigate('/')}>Back to Home</button>
      </div>
      <DisclaimerFooter />
    </div>
  );
}
