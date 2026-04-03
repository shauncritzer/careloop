import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import DisclaimerFooter from '../components/DisclaimerFooter';
import { usePatientStore, DailyLog } from '../stores/patientStore';

function MiniChart({ label, data, unit, color }: { label: string; data: { date: string; value: number | null }[]; unit: string; color: string }) {
  const valid = data.filter((d) => d.value != null);
  if (valid.length === 0) {
    return (
      <View style={styles.chartBox}>
        <Text style={styles.chartLabel}>{label}</Text>
        <Text style={styles.noData}>No data recorded</Text>
      </View>
    );
  }

  const values = valid.map((d) => d.value!);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return (
    <View style={styles.chartBox}>
      <Text style={styles.chartLabel}>{label}</Text>
      <View style={styles.barRow}>
        {data.map((d, i) => {
          if (d.value == null) {
            return (
              <View key={i} style={styles.barCol}>
                <View style={[styles.bar, { height: 4, backgroundColor: '#EEE' }]} />
                <Text style={styles.barDate}>{d.date.slice(5)}</Text>
              </View>
            );
          }
          const range = max - min || 1;
          const height = 20 + ((d.value - min) / range) * 60;
          return (
            <View key={i} style={styles.barCol}>
              <Text style={styles.barValue}>{d.value}{unit}</Text>
              <View style={[styles.bar, { height, backgroundColor: color }]} />
              <Text style={styles.barDate}>{d.date.slice(5)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function SymptomRow({ logs }: { logs: DailyLog[] }) {
  const symptomKeys = [
    'breathing_worse', 'mild_confusion', 'severe_confusion',
    'stomach_pain_bent_over', 'swelling', 'poor_sleep',
    'weak_exhausted', 'poor_appetite', 'cough_worse', 'fall_or_near_fall',
  ] as const;

  return (
    <View style={styles.chartBox}>
      <Text style={styles.chartLabel}>Symptom Flags</Text>
      <View style={styles.symptomTable}>
        {logs.map((log, i) => {
          const active = symptomKeys.filter((k) => (log as any)[k]);
          return (
            <View key={i} style={styles.symptomDay}>
              <Text style={styles.barDate}>{log.log_date.slice(5)}</Text>
              {active.length === 0 ? (
                <View style={[styles.dot, { backgroundColor: '#4CAF50' }]} />
              ) : (
                active.map((k, j) => (
                  <View key={j} style={[styles.dot, { backgroundColor: '#F44336' }]} />
                ))
              )}
              {active.length > 0 && <Text style={styles.symptomCount}>{active.length}</Text>}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function MedAdherence({ logs }: { logs: DailyLog[] }) {
  return (
    <View style={styles.chartBox}>
      <Text style={styles.chartLabel}>Medication Adherence</Text>
      <View style={styles.barRow}>
        {logs.map((log, i) => (
          <View key={i} style={styles.barCol}>
            <View
              style={[
                styles.medDot,
                {
                  backgroundColor:
                    log.lasix_taken === false || log.all_meds_taken === false
                      ? '#FFC107'
                      : '#4CAF50',
                },
              ]}
            />
            <Text style={styles.barDate}>{log.log_date.slice(5)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function TrendsScreen() {
  const { recentLogs, patient } = usePatientStore();
  const sorted = [...recentLogs].sort((a, b) => a.log_date.localeCompare(b.log_date));

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>7-Day Trends</Text>
        <Text style={styles.subtitle}>{patient?.name}</Text>

        <MiniChart
          label="Weight (lbs)"
          data={sorted.map((l) => ({ date: l.log_date, value: l.weight_lbs }))}
          unit=""
          color="#1565C0"
        />

        <MiniChart
          label="Systolic BP"
          data={sorted.map((l) => ({ date: l.log_date, value: l.systolic_bp }))}
          unit=""
          color="#D32F2F"
        />

        <MiniChart
          label="Pulse (bpm)"
          data={sorted.map((l) => ({ date: l.log_date, value: l.pulse_bpm }))}
          unit=""
          color="#F57C00"
        />

        <MiniChart
          label="SpO2 (%)"
          data={sorted.map((l) => ({ date: l.log_date, value: l.spo2 }))}
          unit="%"
          color="#00897B"
        />

        <SymptomRow logs={sorted} />
        <MedAdherence logs={sorted} />
      </ScrollView>
      <DisclaimerFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFF' },
  container: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 26, fontWeight: '700', color: '#222', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 16 },
  chartBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  chartLabel: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 12 },
  noData: { fontSize: 16, color: '#AAA' },
  barRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  barCol: { alignItems: 'center', flex: 1 },
  bar: { width: 24, borderRadius: 4, marginBottom: 4 },
  barValue: { fontSize: 12, color: '#555', marginBottom: 2 },
  barDate: { fontSize: 11, color: '#999' },
  symptomTable: { flexDirection: 'row', justifyContent: 'space-around' },
  symptomDay: { alignItems: 'center', gap: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  symptomCount: { fontSize: 11, color: '#C62828', fontWeight: '600' },
  medDot: { width: 20, height: 20, borderRadius: 10, marginBottom: 4 },
});
