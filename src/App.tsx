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

export default function App() {
  const { session, loading, initialize } = useAuthStore();
  const { patient } = usePatientStore();

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

  if (!patient) {
    return (
      <Routes>
        <Route path="*" element={<PatientSetupScreen />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/checkin" element={<DailyCheckInScreen />} />
      <Route path="/trends" element={<TrendsScreen />} />
      <Route path="/summary" element={<DoctorSummaryScreen />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
