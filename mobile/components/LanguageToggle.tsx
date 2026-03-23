/**
 * LanguageToggle — 3-way segmented control for AR | EN | FR.
 * Active pill: brand green background + white text.
 * WCAG 2.1 AA: minHeight 44, accessibilityRole="tab", accessibilityState.selected.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { switchLanguage, type Lang } from '../i18n';

const LANGS: { value: Lang; label: string }[] = [
  { value: 'ar', label: 'ع' },
  { value: 'en', label: 'EN' },
  { value: 'fr', label: 'FR' },
];

interface Props {
  current: Lang;
}

export default function LanguageToggle({ current }: Props) {
  return (
    <View style={styles.container} accessibilityRole="tablist" accessibilityLabel="Language selector">
      {LANGS.map(({ value, label }) => {
        const active = current === value;
        return (
          <Pressable
            key={value}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => switchLanguage(value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:  'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius:   8,
    padding:        2,
    gap:            2,
  },
  pill: {
    minHeight:      44,
    minWidth:       40,
    justifyContent: 'center',
    alignItems:     'center',
    borderRadius:   6,
    paddingHorizontal: 8,
  },
  pillActive: {
    backgroundColor: '#10B981',
  },
  pillText: {
    color:      'rgba(255,255,255,0.8)',
    fontSize:   13,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
});
