import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { usePatientStore } from './stores/patientStore';

import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import PatientSetupScreen from './screens/PatientSetupScreen';
import HomeScreen from './screens/HomeScreen';
import DailyCheckInScreen from './screens/DailyCheckInScreen';
import TrendsScreen from './screens/TrendsScreen';
import DoctorSummaryScreen from './screens/DoctorSummaryScreen';
import FamilySharingScreen from './screens/FamilySharingScreen';

export default function App() {
  const { session, profile, loading, initialize } = useAuthStore();
  const { patient, isReadOnly, loading: patientLoading } = usePatientStore();

  useEffect(() => {
    initialize();
  }, []);

  if (loading) {
    return (
      <div className="page" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ fontSize: 20, color: '#888' }}>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/signup" element={<SignupScreen />} />
        <Route path="*" element={<LoginScreen />} />
      </Routes>
    );
  }

  // Family members who have access via family_access table
  // should go straight to the home screen (read-only) — not patient setup
  if (!patient && profile?.role !== 'family') {
    return (
      <Routes>
        <Route path="*" element={<PatientSetupScreen />} />
      </Routes>
    );
  }

  if (!patient && profile?.role === 'family') {
    return (
      <div className="page" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ padding: 24, textAlign: 'center' }}>
          <h2 style={{ color: '#1565C0' }}>Welcome to CareLoop</h2>
          <p style={{ fontSize: 16, color: '#666', marginTop: 12 }}>
            A caregiver hasn't shared patient access with you yet.
            Ask them to invite your email in Family Sharing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      {!isReadOnly && <Route path="/checkin" element={<DailyCheckInScreen />} />}
      <Route path="/trends" element={<TrendsScreen />} />
      <Route path="/summary" element={<DoctorSummaryScreen />} />
      {!isReadOnly && <Route path="/family" element={<FamilySharingScreen />} />}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
