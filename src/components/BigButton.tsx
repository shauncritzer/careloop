import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';

interface Props {
  title: string;
  onPress: () => void;
  color?: string;
  textColor?: string;
  style?: ViewStyle;
  disabled?: boolean;
}

export default function BigButton({
  title,
  onPress,
  color = '#2196F3',
  textColor = '#FFF',
  style,
  disabled = false,
}: Props) {
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: disabled ? '#CCC' : color }, style]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Text style={[styles.text, { color: textColor }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    minWidth: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginVertical: 8,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
  },
});
