import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import BigButton from '../components/BigButton';
import StatusCard from '../components/StatusCard';
import DisclaimerFooter from '../components/DisclaimerFooter';
import { useAuthStore } from '../stores/authStore';
import { usePatientStore } from '../stores/patientStore';
import { evaluateAlerts, Severity } from '../lib/alertEngine';

export default function HomeScreen({ navigation }: any) {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const { patient, recentLogs, todayLog, fetchPatient, loading } = usePatientStore();

  useEffect(() => {
    if (user) fetchPatient(user.id);
  }, [user]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let severity: Severity = 'green';
  let messages = ['No check-in recorded yet today. Tap below to start.'];

  if (todayLog && patient) {
    const yesterdayLog = recentLogs.find((l) => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return l.log_date === yesterday.toISOString().split('T')[0];
    });

    const sevenDayLog = recentLogs.find((l) => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return l.log_date === d.toISOString().split('T')[0];
    });

    const poorSleepYesterday = yesterdayLog?.poor_sleep ?? false;

    const result = evaluateAlerts(
      todayLog,
      {
        baseline_weight_lbs: patient.baseline_weight_lbs,
        baseline_sys_bp: patient.baseline_sys_bp,
        baseline_dia_bp: patient.baseline_dia_bp,
        baseline_pulse: patient.baseline_pulse,
        baseline_spo2: patient.baseline_spo2,
      },
      {
        yesterdayWeight: yesterdayLog?.weight_lbs ?? null,
        weightSevenDaysAgo: sevenDayLog?.weight_lbs ?? null,
        poorSleepYesterday,
      }
    );
    severity = result.severity;
    messages = result.messages;
  }

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.patientName}>{patient?.name ?? 'Loading...'}</Text>
        <Text style={styles.date}>{today}</Text>

        <StatusCard severity={severity} messages={messages} />

        <BigButton
          title={todayLog ? "Update Today's Check-In" : "Start Today's Check-In"}
          onPress={() => navigation.navigate('DailyCheckIn')}
          color="#1565C0"
          style={{ marginTop: 20 }}
        />

        <BigButton
          title="View 7-Day Trends"
          onPress={() => navigation.navigate('Trends')}
          color="#00897B"
        />

        <BigButton
          title="Generate Doctor Summary"
          onPress={() => navigation.navigate('DoctorSummary')}
          color="#6A1B9A"
        />

        <BigButton
          title="Sign Out"
          onPress={signOut}
          color="#FFF"
          textColor="#999"
          style={{ borderWidth: 1, borderColor: '#DDD', marginTop: 24 }}
        />
      </ScrollView>
      <DisclaimerFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFF' },
  container: { paddingHorizontal: 24, paddingVertical: 20 },
  patientName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
  },
  date: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
});
