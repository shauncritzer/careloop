import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/authStore';
import { usePatientStore } from '../stores/patientStore';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import PatientSetupScreen from '../screens/PatientSetupScreen';
import HomeScreen from '../screens/HomeScreen';
import DailyCheckInScreen from '../screens/DailyCheckInScreen';
import TrendsScreen from '../screens/TrendsScreen';
import DoctorSummaryScreen from '../screens/DoctorSummaryScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { session, loading: authLoading } = useAuthStore();
  const { patient, loading: patientLoading } = usePatientStore();

  if (authLoading) return null;

  return (
    <Stack.Navigator
      screenOptions={{
        headerTitleStyle: { fontSize: 20, fontWeight: '600' },
        headerBackTitle: 'Back',
      }}
    >
      {!session ? (
        // Auth flow
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Signup"
            component={SignupScreen}
            options={{ title: 'Create Account' }}
          />
        </>
      ) : !patient ? (
        // Patient setup
        <Stack.Screen
          name="PatientSetup"
          component={PatientSetupScreen}
          options={{ title: 'Patient Setup', headerBackVisible: false }}
        />
      ) : (
        // Main app
        <>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'CareLoop', headerBackVisible: false }}
          />
          <Stack.Screen
            name="DailyCheckIn"
            component={DailyCheckInScreen}
            options={{ title: "Today's Check-In" }}
          />
          <Stack.Screen
            name="Trends"
            component={TrendsScreen}
            options={{ title: '7-Day Trends' }}
          />
          <Stack.Screen
            name="DoctorSummary"
            component={DoctorSummaryScreen}
            options={{ title: 'Doctor Summary' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
