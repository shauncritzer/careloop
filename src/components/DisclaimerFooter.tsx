import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DisclaimerFooter() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        CareLoop does not provide medical diagnosis or emergency services. If
        symptoms are severe, contact emergency services.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  text: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
  },
});
