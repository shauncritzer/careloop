import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusCard from '../components/StatusCard';
import DisclaimerFooter from '../components/DisclaimerFooter';
import { useAuthStore } from '../stores/authStore';
import { usePatientStore } from '../stores/patientStore';
import { evaluateAlerts, Severity } from '../lib/alertEngine';

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const { patient, recentLogs, todayLog, isReadOnly, fetchPatient } = usePatientStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) fetchPatient(user.id);
  }, [user]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  let severity: Severity = 'green';
  let messages = ['No check-in recorded yet today. Tap below to start.'];

  if (isReadOnly && !todayLog) {
    messages = ['No check-in recorded yet today.'];
  }

  if (todayLog && patient) {
    const yesterdayLog = recentLogs.find((l) => {
      const d = new Date(); d.setDate(d.getDate() - 1);
      return l.log_date === d.toISOString().split('T')[0];
    });
    const sevenDayLog = recentLogs.find((l) => {
      const d = new Date(); d.setDate(d.getDate() - 7);
      return l.log_date === d.toISOString().split('T')[0];
    });
    const result = evaluateAlerts(todayLog, {
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
    severity = result.severity;
    messages = result.messages;
  }

  return (
    <div className="page">
      <div className="page-content">
        <h1 className="center">{patient?.name ?? 'Loading...'}</h1>
        <p className="center subtitle">{today}</p>
        {isReadOnly && (
          <p className="center" style={{ fontSize: 14, color: '#1565C0', marginTop: 4 }}>Family View (read-only)</p>
        )}

        <StatusCard severity={severity} messages={messages} />

        {!isReadOnly && (
          <button className="btn btn-blue" style={{ marginTop: 20 }} onClick={() => navigate('/checkin')}>
            {todayLog ? "Update Today's Check-In" : "Start Today's Check-In"}
          </button>
        )}
        <button className="btn btn-teal" onClick={() => navigate('/trends')}>
          View 7-Day Trends
        </button>
        <button className="btn btn-purple" onClick={() => navigate('/summary')}>
          Generate Doctor Summary
        </button>
        {!isReadOnly && (
          <button className="btn btn-outline" onClick={() => navigate('/family')}>
            Family Sharing
          </button>
        )}
        {!isReadOnly && (
          <button className="btn btn-ghost" onClick={() => navigate('/edit-profile')}>
            Edit Patient Profile
          </button>
        )}
        <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={signOut}>
          Sign Out
        </button>
      </div>
      <DisclaimerFooter />
    </div>
  );
}
