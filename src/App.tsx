import { useEffect, useRef } from 'react';
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
import EditProfileScreen from './screens/EditProfileScreen';

export default function App() {
  const { session, user, loading: authLoading, initialize } = useAuthStore();
  const { patient, isReadOnly, loading: patientLoading, fetchPatient } = usePatientStore();
  const fetchedForUser = useRef<string | null>(null);

  useEffect(() => {
    initialize();
  }, []);

  // Fetch patient once per user — skip if already fetched or patient already set
  useEffect(() => {
    if (user && !patient && fetchedForUser.current !== user.id) {
      fetchedForUser.current = user.id;
      fetchPatient(user.id);
    }
    if (!user) {
      fetchedForUser.current = null;
    }
  }, [user, patient]);

  // Show loading during auth init or initial patient fetch
  if (authLoading || (user && !patient && patientLoading)) {
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
      {!isReadOnly && <Route path="/checkin" element={<DailyCheckInScreen />} />}
      <Route path="/trends" element={<TrendsScreen />} />
      <Route path="/summary" element={<DoctorSummaryScreen />} />
      {!isReadOnly && <Route path="/family" element={<FamilySharingScreen />} />}
      {!isReadOnly && <Route path="/edit-profile" element={<EditProfileScreen />} />}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
