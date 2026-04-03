import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import BigButton from '../components/BigButton';
import DisclaimerFooter from '../components/DisclaimerFooter';
import { usePatientStore } from '../stores/patientStore';

function generateSummary(patientName: string, logs: any[]): string {
  if (logs.length === 0) return 'No daily logs recorded in the past 7 days.';

  const sorted = [...logs].sort((a, b) => a.log_date.localeCompare(b.log_date));
  const first = sorted[0].log_date;
  const last = sorted[sorted.length - 1].log_date;

  const formatDate = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const range = `${formatDate(first)}\u2013${formatDate(last)}`;

  // Weight
  const weights = sorted.map((l) => l.weight_lbs).filter((w: any) => w != null);
  let weightStr = 'Weight not recorded.';
  if (weights.length > 0) {
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const change = weights[weights.length - 1] - weights[0];
    const dir = change > 0 ? 'up' : change < 0 ? 'down' : 'unchanged';
    weightStr = `Weight ranged from ${minW}\u2013${maxW} lbs, ${dir} ${Math.abs(change).toFixed(1)} lbs overall.`;
  }

  // BP
  const bps = sorted.filter((l) => l.systolic_bp != null && l.diastolic_bp != null);
  let bpStr = 'Blood pressure not recorded.';
  if (bps.length > 0) {
    const avgSys = Math.round(bps.reduce((s: number, l: any) => s + l.systolic_bp, 0) / bps.length);
    const avgDia = Math.round(bps.reduce((s: number, l: any) => s + l.diastolic_bp, 0) / bps.length);
    bpStr = `Blood pressure averaged ${avgSys}/${avgDia}.`;
  }

  // SpO2
  const o2s = sorted.map((l) => l.spo2).filter((v: any) => v != null);
  let o2Str = 'Oxygen not recorded.';
  if (o2s.length > 0) {
    const minO = Math.min(...o2s);
    const maxO = Math.max(...o2s);
    o2Str = `Oxygen ${minO}\u2013${maxO}%.`;
  }

  // Symptoms
  const symptomKeys = [
    { key: 'breathing_worse', label: 'breathing worse' },
    { key: 'mild_confusion', label: 'mild confusion' },
    { key: 'severe_confusion', label: 'severe confusion' },
    { key: 'swelling', label: 'swelling' },
    { key: 'poor_sleep', label: 'poor sleep' },
    { key: 'stomach_pain_bent_over', label: 'stomach pain' },
    { key: 'weak_exhausted', label: 'weakness/exhaustion' },
    { key: 'poor_appetite', label: 'poor appetite' },
    { key: 'cough_worse', label: 'worsening cough' },
    { key: 'fall_or_near_fall', label: 'fall or near-fall' },
  ];
  const symptomNotes: string[] = [];
  for (const { key, label } of symptomKeys) {
    const count = sorted.filter((l) => l[key]).length;
    if (count > 0) {
      symptomNotes.push(`${label} noted on ${count} day${count > 1 ? 's' : ''}`);
    }
  }
  const symptomStr =
    symptomNotes.length > 0 ? symptomNotes.join('. ') + '.' : 'No symptoms reported.';

  // Meds
  const lasixMissed = sorted.filter((l) => l.lasix_taken === false).length;
  const medsMissed = sorted.filter((l) => l.all_meds_taken === false).length;
  let medStr = 'All medications taken as prescribed.';
  if (lasixMissed > 0 || medsMissed > 0) {
    const parts: string[] = [];
    if (lasixMissed > 0) parts.push(`Lasix missed ${lasixMissed} time${lasixMissed > 1 ? 's' : ''}`);
    if (medsMissed > 0) parts.push(`other medications missed ${medsMissed} time${medsMissed > 1 ? 's' : ''}`);
    medStr = parts.join('. ') + '.';
  }

  // Falls
  const falls = sorted.filter((l) => l.fall_or_near_fall).length;
  const fallStr = falls > 0 ? `${falls} fall/near-fall reported.` : 'No falls reported.';

  return `${patientName} \u2014 Past 7 days (${range}):\n\n${weightStr}\n${bpStr}\n${o2Str}\n\n${symptomStr}\n\n${medStr}\n${fallStr}`;
}

export default function DoctorSummaryScreen() {
  const { patient, recentLogs } = usePatientStore();
  const [copied, setCopied] = useState(false);

  const summary = generateSummary(patient?.name ?? 'Patient', recentLogs);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(summary);
    setCopied(true);
    Alert.alert('Copied', 'Summary copied to clipboard. You can paste it in a message or email.');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Doctor Summary</Text>
        <Text style={styles.subtitle}>7-day summary for the care team</Text>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryText}>{summary}</Text>
        </View>

        <BigButton
          title={copied ? 'Copied!' : 'Copy to Clipboard'}
          onPress={handleCopy}
          color="#6A1B9A"
        />
      </ScrollView>
      <DisclaimerFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFF' },
  container: { paddingHorizontal: 24, paddingVertical: 20 },
  title: { fontSize: 26, fontWeight: '700', color: '#222', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 20 },
  summaryBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#333',
  },
});
