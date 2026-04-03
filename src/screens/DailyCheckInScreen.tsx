import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import BigButton from '../components/BigButton';
import StatusCard from '../components/StatusCard';
import DisclaimerFooter from '../components/DisclaimerFooter';
import { useAuthStore } from '../stores/authStore';
import { usePatientStore } from '../stores/patientStore';
import { evaluateAlerts, AlertResult } from '../lib/alertEngine';
import { supabase } from '../lib/supabase';

const SYMPTOM_LIST = [
  { key: 'breathing_worse', label: 'Breathing Worse' },
  { key: 'mild_confusion', label: 'Mild Confusion' },
  { key: 'severe_confusion', label: 'Severe Confusion' },
  { key: 'stomach_pain_bent_over', label: 'Stomach Pain / Bent Over' },
  { key: 'swelling', label: 'Swelling' },
  { key: 'poor_sleep', label: 'Poor Sleep' },
  { key: 'weak_exhausted', label: 'Weak / Exhausted' },
  { key: 'poor_appetite', label: 'Poor Appetite' },
  { key: 'cough_worse', label: 'Cough Worse' },
  { key: 'fall_or_near_fall', label: 'Fall or Near-Fall' },
] as const;

type SymptomKey = (typeof SYMPTOM_LIST)[number]['key'];

export default function DailyCheckInScreen({ navigation }: any) {
  const user = useAuthStore((s) => s.user);
  const { patient, recentLogs, saveDailyLog, todayLog } = usePatientStore();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [alertResult, setAlertResult] = useState<AlertResult | null>(null);

  // Form state
  const [weight, setWeight] = useState(todayLog?.weight_lbs?.toString() ?? '');
  const [sysBp, setSysBp] = useState(todayLog?.systolic_bp?.toString() ?? '');
  const [diaBp, setDiaBp] = useState(todayLog?.diastolic_bp?.toString() ?? '');
  const [pulse, setPulse] = useState(todayLog?.pulse_bpm?.toString() ?? '');
  const [spo2, setSpo2] = useState(todayLog?.spo2?.toString() ?? '');
  const [symptoms, setSymptoms] = useState<Record<SymptomKey, boolean>>({
    breathing_worse: todayLog?.breathing_worse ?? false,
    mild_confusion: todayLog?.mild_confusion ?? false,
    severe_confusion: todayLog?.severe_confusion ?? false,
    stomach_pain_bent_over: todayLog?.stomach_pain_bent_over ?? false,
    swelling: todayLog?.swelling ?? false,
    poor_sleep: todayLog?.poor_sleep ?? false,
    weak_exhausted: todayLog?.weak_exhausted ?? false,
    poor_appetite: todayLog?.poor_appetite ?? false,
    cough_worse: todayLog?.cough_worse ?? false,
    fall_or_near_fall: todayLog?.fall_or_near_fall ?? false,
  });
  const [lasixTaken, setLasixTaken] = useState<boolean | null>(todayLog?.lasix_taken ?? null);
  const [allMedsTaken, setAllMedsTaken] = useState<boolean | null>(todayLog?.all_meds_taken ?? null);
  const [ambienTaken, setAmbienTaken] = useState<boolean | null>(todayLog?.ambien_taken_last_night ?? null);
  const [medNote, setMedNote] = useState(todayLog?.med_note ?? '');
  const [generalNote, setGeneralNote] = useState(todayLog?.general_note ?? '');

  const toggleSymptom = (key: SymptomKey) => {
    setSymptoms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const YesNo = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: boolean | null;
    onChange: (v: boolean) => void;
  }) => (
    <View style={styles.yesNoRow}>
      <Text style={styles.yesNoLabel}>{label}</Text>
      <View style={styles.yesNoButtons}>
        <TouchableOpacity
          style={[styles.yesNoBtn, value === true && styles.yesNoSelected]}
          onPress={() => onChange(true)}
        >
          <Text style={[styles.yesNoText, value === true && styles.yesNoSelectedText]}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.yesNoBtn, value === false && styles.yesNoSelectedNo]}
          onPress={() => onChange(false)}
        >
          <Text style={[styles.yesNoText, value === false && styles.yesNoSelectedText]}>No</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleSave = async () => {
    if (!patient || !user) return;
    setSaving(true);

    const today = new Date().toISOString().split('T')[0];
    const logData = {
      patient_id: patient.id,
      log_date: today,
      weight_lbs: weight ? parseFloat(weight) : null,
      systolic_bp: sysBp ? parseInt(sysBp) : null,
      diastolic_bp: diaBp ? parseInt(diaBp) : null,
      pulse_bpm: pulse ? parseInt(pulse) : null,
      spo2: spo2 ? parseInt(spo2) : null,
      ...symptoms,
      lasix_taken: lasixTaken,
      all_meds_taken: allMedsTaken,
      ambien_taken_last_night: ambienTaken,
      med_note: medNote || null,
      general_note: generalNote || null,
      created_by_user_id: user.id,
    };

    try {
      const saved = await saveDailyLog(logData);

      // Run alert engine
      const yesterdayLog = recentLogs.find((l) => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return l.log_date === d.toISOString().split('T')[0];
      });
      const sevenDayLog = recentLogs.find((l) => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return l.log_date === d.toISOString().split('T')[0];
      });

      const result = evaluateAlerts(
        { ...logData, breathing_worse: symptoms.breathing_worse } as any,
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
          poorSleepYesterday: yesterdayLog?.poor_sleep ?? false,
        }
      );

      // Save alert
      await supabase.from('alerts').insert({
        patient_id: patient.id,
        daily_log_id: saved.id,
        severity: result.severity,
        message: result.messages.join(' '),
      });

      setAlertResult(result);
      setStep(6); // result screen
    } catch (err: any) {
      Alert.alert('Error saving', err.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const cards = [
    // Card 0: Weight
    <View key="weight" style={styles.card}>
      <Text style={styles.cardTitle}>Weight</Text>
      <Text style={styles.cardDesc}>Enter today's weight in pounds</Text>
      <TextInput
        style={styles.bigInput}
        value={weight}
        onChangeText={setWeight}
        placeholder="e.g. 188"
        keyboardType="numeric"
      />
      <Text style={styles.unit}>lbs</Text>
    </View>,

    // Card 1: BP + Pulse
    <View key="bp" style={styles.card}>
      <Text style={styles.cardTitle}>Blood Pressure & Pulse</Text>
      <Text style={styles.cardDesc}>Systolic / Diastolic</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.bigInput, styles.halfInput]}
          value={sysBp}
          onChangeText={setSysBp}
          placeholder="Sys"
          keyboardType="numeric"
        />
        <Text style={styles.slash}>/</Text>
        <TextInput
          style={[styles.bigInput, styles.halfInput]}
          value={diaBp}
          onChangeText={setDiaBp}
          placeholder="Dia"
          keyboardType="numeric"
        />
      </View>
      <Text style={styles.cardDesc}>Pulse (beats per minute)</Text>
      <TextInput
        style={styles.bigInput}
        value={pulse}
        onChangeText={setPulse}
        placeholder="e.g. 72"
        keyboardType="numeric"
      />
    </View>,

    // Card 2: SpO2
    <View key="spo2" style={styles.card}>
      <Text style={styles.cardTitle}>Oxygen Level (SpO2)</Text>
      <Text style={styles.cardDesc}>From the pulse oximeter</Text>
      <TextInput
        style={styles.bigInput}
        value={spo2}
        onChangeText={setSpo2}
        placeholder="e.g. 96"
        keyboardType="numeric"
      />
      <Text style={styles.unit}>%</Text>
    </View>,

    // Card 3: Symptoms
    <View key="symptoms" style={styles.card}>
      <Text style={styles.cardTitle}>Symptoms</Text>
      <Text style={styles.cardDesc}>Tap any that apply today</Text>
      <View style={styles.symptomGrid}>
        {SYMPTOM_LIST.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.symptomBtn, symptoms[s.key] && styles.symptomActive]}
            onPress={() => toggleSymptom(s.key)}
          >
            <Text style={[styles.symptomText, symptoms[s.key] && styles.symptomTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>,

    // Card 4: Meds
    <View key="meds" style={styles.card}>
      <Text style={styles.cardTitle}>Medications</Text>
      <YesNo label="Lasix taken today?" value={lasixTaken} onChange={setLasixTaken} />
      <YesNo label="All medications taken?" value={allMedsTaken} onChange={setAllMedsTaken} />
      <YesNo label="Ambien taken last night?" value={ambienTaken} onChange={setAmbienTaken} />
      <Text style={styles.cardDesc}>Optional medication note</Text>
      <TextInput
        style={[styles.bigInput, { fontSize: 16 }]}
        value={medNote}
        onChangeText={setMedNote}
        placeholder="Any notes about meds..."
        multiline
      />
    </View>,

    // Card 5: General note
    <View key="note" style={styles.card}>
      <Text style={styles.cardTitle}>General Note</Text>
      <Text style={styles.cardDesc}>Anything else to record today?</Text>
      <TextInput
        style={[styles.bigInput, { minHeight: 100, textAlignVertical: 'top', fontSize: 16 }]}
        value={generalNote}
        onChangeText={setGeneralNote}
        placeholder="Optional notes..."
        multiline
      />
    </View>,

    // Card 6: Result
    alertResult ? (
      <View key="result" style={styles.card}>
        <Text style={styles.cardTitle}>Today's Status</Text>
        <StatusCard severity={alertResult.severity} messages={alertResult.messages} />
        <BigButton title="Done \u2014 Back to Home" onPress={() => navigation.goBack()} color="#4CAF50" />
      </View>
    ) : null,
  ];

  const isLastInputCard = step === 5;

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Progress */}
        <Text style={styles.progress}>Step {Math.min(step + 1, 6)} of 6</Text>

        {cards[step]}

        {step < 5 && (
          <View style={styles.navRow}>
            {step > 0 && (
              <BigButton
                title="Back"
                onPress={() => setStep(step - 1)}
                color="#FFF"
                textColor="#666"
                style={{ flex: 1, borderWidth: 1, borderColor: '#DDD', marginRight: 8 }}
              />
            )}
            <BigButton
              title="Next"
              onPress={() => setStep(step + 1)}
              style={{ flex: 1 }}
            />
          </View>
        )}

        {isLastInputCard && step === 5 && (
          <BigButton
            title={saving ? 'Saving...' : 'Save & See Results'}
            onPress={handleSave}
            disabled={saving}
            color="#4CAF50"
          />
        )}
      </ScrollView>
      <DisclaimerFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFF' },
  container: { paddingHorizontal: 24, paddingVertical: 16 },
  progress: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  bigInput: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    backgroundColor: '#FFF',
    minHeight: 56,
    textAlign: 'center',
  },
  halfInput: { flex: 1 },
  unit: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  slash: {
    fontSize: 24,
    color: '#666',
    marginHorizontal: 8,
  },
  symptomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  symptomBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
  },
  symptomActive: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  symptomText: {
    fontSize: 16,
    color: '#555',
  },
  symptomTextActive: {
    color: '#C62828',
    fontWeight: '600',
  },
  yesNoRow: {
    marginBottom: 16,
  },
  yesNoLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  yesNoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  yesNoBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  yesNoSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  yesNoSelectedNo: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  yesNoText: {
    fontSize: 18,
    color: '#555',
  },
  yesNoSelectedText: {
    fontWeight: '700',
  },
  navRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
});
