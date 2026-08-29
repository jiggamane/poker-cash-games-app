import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../design/useTheme';
import { radius, space, type } from '../design/tokens';
import {
  COMMON_CURRENCIES,
  CURRENCIES,
  currencyFor,
  searchCurrencies,
} from '../data/currencies';

/**
 * Picking the currency a group keeps its book in.
 *
 * FOUR CHIPS WAS A LIST OF THE CURRENCIES WE HAPPENED TO THINK OF. Every
 * currency in ISO 4217 is here, and the way to reach one is to type it: the
 * code, the symbol or the name of the money all match, and the suggestions
 * narrow as the letters go in. A hundred and fifty-six rows in a scroller is
 * not a better answer than a search box — nobody scrolls to Zambia.
 *
 * The four that were chips stay reachable in one tap, as the empty state of
 * the same control, because they are what a table in this app has actually
 * been using. Anything picked by search joins them, so the choice is always
 * visible as a selected chip rather than only as text in a box.
 *
 * The four live in `data/currencies.ts` because O1's picker shows the same
 * four above its own list, and two copies would drift.
 */
export function CurrencyField({
  value,
  onChange,
  label = 'CURRENCY',
}: {
  /** ISO 4217 code held by the caller. */
  value: string;
  onChange: (code: string) => void;
  label?: string;
}) {
  const t = useTheme();
  const [query, setQuery] = useState('');

  const picked = currencyFor(value);
  const searching = query.trim() !== '';
  const matches = searching ? searchCurrencies(query) : [];

  // The four, plus whatever was searched for, so the picked one is never
  // off-screen after the box is cleared.
  const chips = COMMON_CURRENCIES.includes(picked.code)
    ? CURRENCIES.filter((c) => COMMON_CURRENCIES.includes(c.code))
    : [...CURRENCIES.filter((c) => COMMON_CURRENCIES.includes(c.code)), picked];

  function pick(code: string) {
    onChange(code);
    setQuery('');
    Keyboard.dismiss();
  }

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: t.muted }]}>{label}</Text>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={`${picked.code} · ${picked.name}`}
        placeholderTextColor={t.muted}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => {
          if (matches.length > 0) pick(matches[0]!.code);
        }}
        style={[
          styles.input,
          { color: t.text, backgroundColor: t.surface, borderColor: t.hairline },
        ]}
      />

      {searching ? (
        <View style={[styles.list, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          {matches.map((c, i) => (
            <Pressable
              key={c.code}
              accessibilityRole="button"
              accessibilityState={{ selected: c.code === picked.code }}
              onPress={() => pick(c.code)}
              style={({ pressed }) => [
                styles.row,
                {
                  borderTopColor: t.hairline,
                  borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[styles.code, { color: t.text }]}>{c.code}</Text>
              <Text style={[styles.name, { color: t.muted }]} numberOfLines={1}>
                {c.name}
              </Text>
              <Text style={[styles.symbol, { color: t.dim }]}>{c.symbol}</Text>
            </Pressable>
          ))}

          {matches.length === 0 && (
            <View style={styles.row}>
              <Text style={[styles.name, { color: t.muted }]}>No currency by that name.</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.chips}>
          {chips.map((c) => (
            <Pressable
              key={c.code}
              accessibilityRole="button"
              accessibilityLabel={`${c.code} · ${c.name}`}
              accessibilityState={{ selected: c.code === picked.code }}
              onPress={() => pick(c.code)}
              style={({ pressed }) => [
                styles.chip,
                c.code === picked.code
                  ? { backgroundColor: t.text, borderColor: t.text }
                  : { borderColor: t.quietOutline },
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text
                style={[styles.chipLabel, { color: c.code === picked.code ? t.onFill : t.text }]}
              >
                {c.code}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Sheet insets, and the same 20 the fields above and the footer below use.
  field: { marginHorizontal: space.card, marginBottom: 20, gap: 10 },
  label: type.label,
  input: {
    ...type.body,
    borderWidth: 1,
    borderRadius: radius.pressable,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },

  list: { borderWidth: 1, borderRadius: radius.pressable, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  code: { ...type.rowName, fontSize: 16 },
  name: { ...type.meta, flexShrink: 1 },
  symbol: { ...type.meta, marginLeft: 'auto' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.pressable, borderWidth: 1.5 },
  chipLabel: { fontSize: 14.5, fontWeight: '600' },
});
