import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import BigButton from '../components/BigButton';
import DisclaimerFooter from '../components/DisclaimerFooter';
import { useAuthStore } from '../stores/authStore';
import { usePatientStore } from '../stores/patientStore';

export default function PatientSetupScreen() {
  const user = useAuthStore((s) => s.user);
  const createPatient = usePatientStore((s) => s.createPatient);

  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [weight, setWeight] = useState('');
  const [sysBp, setSysBp] = useState('');
  const [diaBp, setDiaBp] = useState('');
  const [pulse, setPulse] = useState('');
  const [spo2, setSpo2] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [familyContact, setFamilyContact] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter the patient name.');
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      await createPatient({
        owner_user_id: user.id,
        name: name.trim(),
        date_of_birth: dob || null,
        baseline_weight_lbs: weight ? parseFloat(weight) : null,
        baseline_sys_bp: sysBp ? parseInt(sysBp) : null,
        baseline_dia_bp: diaBp ? parseInt(diaBp) : null,
        baseline_pulse: pulse ? parseInt(pulse) : null,
        baseline_spo2: spo2 ? parseInt(spo2) : null,
        caregiver_name: caregiverName || null,
        family_contact_name: familyContact || null,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not save patient profile.');
    } finally {
      setLoading(false);
    }
  };

  const field = (label: string, value: string, setter: (v: string) => void, opts?: {
    placeholder?: string;
    keyboard?: 'numeric' | 'default';
  }) => (
    <View key={label}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setter}
        placeholder={opts?.placeholder ?? ''}
        keyboardType={opts?.keyboard ?? 'default'}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Patient Profile</Text>
        <Text style={styles.subtitle}>
          Enter baseline information. You can update these later.
        </Text>

        {field('Patient Name *', name, setName, { placeholder: 'Full name' })}
        {field('Date of Birth', dob, setDob, { placeholder: 'YYYY-MM-DD' })}
        {field('Baseline Weight (lbs)', weight, setWeight, { placeholder: 'e.g. 185', keyboard: 'numeric' })}
        {field('Baseline Systolic BP', sysBp, setSysBp, { placeholder: 'e.g. 130', keyboard: 'numeric' })}
        {field('Baseline Diastolic BP', diaBp, setDiaBp, { placeholder: 'e.g. 80', keyboard: 'numeric' })}
        {field('Baseline Pulse', pulse, setPulse, { placeholder: 'e.g. 72', keyboard: 'numeric' })}
        {field('Baseline SpO2 (%)', spo2, setSpo2, { placeholder: 'e.g. 96', keyboard: 'numeric' })}
        {field('Caregiver Name', caregiverName, setCaregiverName, { placeholder: 'Your name' })}
        {field('Family Contact Name', familyContact, setFamilyContact, { placeholder: 'e.g. Son, Daughter' })}

        <BigButton
          title={loading ? 'Saving...' : 'Save & Continue'}
          onPress={handleSave}
          disabled={loading}
          color="#4CAF50"
        />
      </ScrollView>
      <DisclaimerFooter />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFF' },
  container: { paddingHorizontal: 28, paddingVertical: 20 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1565C0',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    backgroundColor: '#FAFAFA',
    minHeight: 52,
  },
});
