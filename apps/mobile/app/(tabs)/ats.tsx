import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import type { AtsReport, CheckResult } from '@roleup/core/lite';
import { api } from '@/api';
import { Button } from '@/components/ui';
import { tabular, type, useTheme } from '@/theme';

const MAX_BYTES = 5 * 1024 * 1024;

function CheckItem({ check }: { check: CheckResult }) {
  const { c } = useTheme();
  const color =
    check.status === 'pass' ? c.success : check.status === 'warn' ? c.warning : c.danger;
  const label = check.status === 'pass' ? 'Pass' : check.status === 'warn' ? 'Warning' : 'Fail';
  return (
    <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: c.border, gap: 2 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <Text style={[type.sm, { color: c.text, fontWeight: '600', flex: 1 }]}>{check.title}</Text>
        <Text style={[type.xs, tabular, { color }]}>
          {label} · {check.points}/{check.maxPoints}
        </Text>
      </View>
      <Text style={[type.sm, { color: c.textMuted }]}>{check.detail}</Text>
      {check.fix ? <Text style={[type.sm, { color: c.text }]}>{check.fix}</Text> : null}
    </View>
  );
}

export default function AtsScreen() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ job?: string; jobTitle?: string }>();
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [jd, setJd] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AtsReport | null>(null);
  const job = params.job ? { slug: params.job, title: params.jobTitle ?? 'selected job' } : null;

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    if (a.size && a.size > MAX_BYTES) return setError('The file is larger than 5 MB.');
    setError(null);
    setReport(null);
    setFile(a);
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setReport(
        await api.atsCheck(
          { uri: file.uri, name: file.name, mimeType: file.mimeType },
          job?.slug,
          jd.trim() || undefined,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check failed');
    } finally {
      setBusy(false);
    }
  };

  const tone = report
    ? report.score >= 85
      ? c.success
      : report.score >= 50
        ? c.warning
        : c.danger
    : c.text;

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ padding: 12, borderRadius: 6, backgroundColor: c.surfaceMuted }}>
        <Text style={[type.sm, { color: c.textMuted }]}>
          <Text style={{ color: c.text, fontWeight: '600' }}>Your resume is not stored. </Text>
          It&apos;s read in memory, scored and discarded.
        </Text>
      </View>

      <Button
        label={file ? `Change file (${file.name})` : 'Choose resume (PDF or DOCX)'}
        onPress={() => void pick()}
      />

      {job ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            padding: 12,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: c.accent,
            backgroundColor: c.accentSubtle,
          }}
        >
          <Text style={[type.sm, { color: c.text, flex: 1 }]}>Comparing with {job.title}</Text>
          <Text
            style={[type.sm, { color: c.accent }]}
            onPress={() => router.setParams({ job: undefined, jobTitle: undefined })}
            accessibilityRole="button"
          >
            Remove
          </Text>
        </View>
      ) : (
        <TextInput
          value={jd}
          onChangeText={setJd}
          multiline
          maxLength={20000}
          placeholder="Optional: paste a job description to see matched and missing skills"
          placeholderTextColor={c.textSubtle}
          accessibilityLabel="Job description"
          style={[
            type.sm,
            {
              minHeight: 96,
              textAlignVertical: 'top',
              borderWidth: 1,
              borderColor: c.borderStrong,
              borderRadius: 6,
              padding: 12,
              color: c.text,
              backgroundColor: c.surface,
            },
          ]}
        />
      )}

      <Button
        primary
        label={busy ? 'Checking…' : 'Check my resume'}
        onPress={() => void run()}
        disabled={!file || busy}
      />
      {error ? (
        <Text style={[type.sm, { color: c.danger }]} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {report && (
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 6,
              backgroundColor: c.surface,
            }}
          >
            <Text style={[type['2xl'], tabular, { color: tone, fontWeight: '600' }]}>
              {report.score}
            </Text>
            <Text style={[type.sm, { color: c.text, flex: 1 }]}>{report.verdict}</Text>
          </View>
          {report.keywords && (
            <View
              style={{
                padding: 12,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 6,
                backgroundColor: c.surface,
                gap: 4,
              }}
            >
              <Text style={[type.sm, tabular, { color: c.text, fontWeight: '600' }]}>
                Keyword match: {report.keywords.matchPercent}%
              </Text>
              <Text style={[type.sm, { color: c.success }]}>
                Matched: {report.keywords.matched.join(', ') || 'none'}
              </Text>
              <Text style={[type.sm, { color: c.danger }]}>
                Missing: {report.keywords.missing.join(', ') || 'none'}
              </Text>
            </View>
          )}
          {report.fixFirst.length > 0 && (
            <View
              style={{
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 6,
                backgroundColor: c.surface,
              }}
            >
              <Text
                style={[
                  type.sm,
                  { color: c.text, fontWeight: '600', padding: 12, paddingBottom: 0 },
                ]}
              >
                Fix these first
              </Text>
              {report.fixFirst.map((x) => (
                <CheckItem key={x.id} check={x} />
              ))}
            </View>
          )}
          <View
            style={{
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 6,
              backgroundColor: c.surface,
            }}
          >
            <Text
              style={[type.sm, { color: c.text, fontWeight: '600', padding: 12, paddingBottom: 0 }]}
            >
              All checks
            </Text>
            {report.checks.map((x) => (
              <CheckItem key={x.id} check={x} />
            ))}
          </View>
          <Text style={[type.xs, { color: c.textSubtle }]}>{report.disclaimer}</Text>
        </View>
      )}
    </ScrollView>
  );
}
