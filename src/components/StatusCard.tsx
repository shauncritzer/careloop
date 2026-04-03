import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Severity } from '../lib/alertEngine';

const COLORS: Record<Severity, { bg: string; border: string; text: string; label: string }> = {
  green: { bg: '#E8F5E9', border: '#4CAF50', text: '#2E7D32', label: 'All Good' },
  yellow: { bg: '#FFF8E1', border: '#FFC107', text: '#F57F17', label: 'Monitor Closely' },
  red: { bg: '#FFEBEE', border: '#F44336', text: '#C62828', label: 'Action Needed' },
};

interface Props {
  severity: Severity;
  messages: string[];
}

export default function StatusCard({ severity, messages }: Props) {
  const c = COLORS[severity];

  return (
    <View style={[styles.card, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.label, { color: c.text }]}>{c.label}</Text>
      {messages.map((msg, i) => (
        <Text key={i} style={[styles.message, { color: c.text }]}>
          {msg}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 20,
    marginVertical: 12,
    marginHorizontal: 4,
  },
  label: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 4,
  },
});
