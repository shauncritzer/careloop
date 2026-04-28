import { useState, useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';
import { usePatient, useDailyLogs, useAlerts } from '@/hooks/useSupabaseData';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, FileText, Copy, CheckCircle2, Sparkles, Download } from 'lucide-react';
import DisclaimerFooter from '@/components/DisclaimerFooter';
import { toast } from 'sonner';
import { Streamdown } from 'streamdown';

function generateBasicSummary(
  patientName: string,
  logs: any[],
  alerts: any[]
): string {
  if (logs.length === 0) return 'No check-in data available for the past 7 days.';

  const dates = logs.map(l => l.log_date).sort();
  const startDate = new Date(dates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endDate = new Date(dates[dates.length - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const weights = logs.map(l => l.weight_lbs).filter((w: any): w is number => w != null);
  const systolics = logs.map(l => l.systolic_bp).filter((s: any): s is number => s != null);
  const diastolics = logs.map(l => l.diastolic_bp).filter((d: any): d is number => d != null);
  const spo2s = logs.map(l => l.spo2).filter((s: any): s is number => s != null);
  const pulses = logs.map(l => l.pulse_bpm).filter((p: any): p is number => p != null);
  const fluids = logs.map(l => l.fluid_intake_oz).filter((f: any): f is number => f != null);
  const sodiums = logs.map(l => l.sodium_mg).filter((s: any): s is number => s != null);

  const confusionDays = logs.filter((l: any) => l.confusion).length;
  const medsMissed = logs.filter((l: any) => l.missed_meds).length;
  const falls = logs.filter((l: any) => l.fall_or_near_fall).length;
  const breathingDays = logs.filter((l: any) => l.breathing_worse).length;
  const swellingDays = logs.filter((l: any) => l.swelling).length;
  const chestPainDays = logs.filter((l: any) => l.chest_pain).length;
  const dizzinessDays = logs.filter((l: any) => l.dizziness).length;

  const redAlerts = alerts.filter((a: any) => a.severity === 'red').length;
  const yellowAlerts = alerts.filter((a: any) => a.severity === 'yellow').length;

  let summary = `7-Day Summary for ${patientName} (${startDate}–${endDate}):\n\n`;

  if (weights.length > 0) {
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const change = weights[weights.length - 1] - weights[0];
    summary += `Weight ranged from ${minW}–${maxW} lbs`;
    if (Math.abs(change) >= 1) summary += `, ${change > 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(1)} lbs overall`;
    summary += '. ';
  }

  if (systolics.length > 0 && diastolics.length > 0) {
    const avgSys = Math.round(systolics.reduce((a: number, b: number) => a + b, 0) / systolics.length);
    const avgDia = Math.round(diastolics.reduce((a: number, b: number) => a + b, 0) / diastolics.length);
    summary += `Blood pressure averaged ${avgSys}/${avgDia}. `;
  }

  if (pulses.length > 0) {
    const avgPulse = Math.round(pulses.reduce((a: number, b: number) => a + b, 0) / pulses.length);
    summary += `Average pulse ${avgPulse} bpm. `;
  }

  if (spo2s.length > 0) {
    const minSpo2 = Math.min(...spo2s);
    const maxSpo2 = Math.max(...spo2s);
    summary += `Oxygen ${minSpo2}–${maxSpo2}%. `;
  }

  if (fluids.length > 0) {
    const avgFluid = Math.round(fluids.reduce((a: number, b: number) => a + b, 0) / fluids.length);
    summary += `Average fluid intake ${avgFluid} oz/day. `;
  }

  if (sodiums.length > 0) {
    const avgSodium = Math.round(sodiums.reduce((a: number, b: number) => a + b, 0) / sodiums.length);
    summary += `Average sodium intake ${avgSodium} mg/day. `;
  }

  summary += '\n\n';
  if (confusionDays > 0) summary += `Confusion noted on ${confusionDays} day${confusionDays > 1 ? 's' : ''}. `;
  if (breathingDays > 0) summary += `Breathing difficulties on ${breathingDays} day${breathingDays > 1 ? 's' : ''}. `;
  if (swellingDays > 0) summary += `Swelling on ${swellingDays} day${swellingDays > 1 ? 's' : ''}. `;
  if (chestPainDays > 0) summary += `Chest pain on ${chestPainDays} day${chestPainDays > 1 ? 's' : ''}. `;
  if (dizzinessDays > 0) summary += `Dizziness on ${dizzinessDays} day${dizzinessDays > 1 ? 's' : ''}. `;
  if (medsMissed > 0) summary += `Medications missed ${medsMissed} time${medsMissed > 1 ? 's' : ''}. `;
  if (falls > 0) summary += `${falls} fall${falls > 1 ? 's' : ''} reported. `;
  else summary += 'No falls reported. ';

  if (redAlerts > 0 || yellowAlerts > 0) {
    summary += `\n\nAlerts: ${redAlerts} urgent, ${yellowAlerts} monitoring.`;
  }

  return summary;
}

export default function DoctorSummary() {
  const [, setLocation] = useLocation();
  const { patient, loading: patientLoading } = usePatient();
  const { logs, loading: logsLoading } = useDailyLogs(patient?.id, 7);
  const { alerts } = useAlerts(patient?.id, 20);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const basicSummary = useMemo(() => {
    if (!patient) return '';
    const recentAlerts = alerts.filter(a => {
      const d = new Date(a.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    });
    return generateBasicSummary(patient.name, logs, recentAlerts);
  }, [patient, logs, alerts]);

  const generateAiSummary = trpc.careloop.generateSummary.useMutation({
    onSuccess: (data) => {
      setAiSummary(String(data.summary));
      setAiLoading(false);
    },
    onError: () => {
      toast.error('Could not generate AI summary. Using basic summary instead.');
      setAiLoading(false);
    },
  });

  const handleAiSummary = useCallback(() => {
    if (!patient) return;
    setAiLoading(true);
    generateAiSummary.mutate({
      patientName: patient.name,
      basicSummary,
      logsJson: JSON.stringify(logs),
    });
  }, [patient, basicSummary, logs, generateAiSummary]);

  const displaySummary = aiSummary || basicSummary;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displaySummary);
      setCopied(true);
      toast.success('Summary copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDownload = () => {
    const patientName = patient?.name || 'Patient';
    const date = new Date().toISOString().split('T')[0];
    const filename = `CareLoop_Summary_${patientName.replace(/\s+/g, '_')}_${date}.txt`;
    const header = `CareLoop — Doctor Summary\nGenerated: ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n`;
    const content = header + displaySummary + '\n\n' + '='.repeat(50) + '\nGenerated by CareLoop. This is not a medical diagnosis.\nAlways confirm findings with the patient\'s care team.';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Summary downloaded');
  };

  if (patientLoading || logsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 container max-w-2xl py-8">
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 min-h-[48px]"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-base">Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
            <FileText className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-semibold">Doctor Summary</h1>
            <p className="text-muted-foreground">7-day report for {patient?.name}</p>
          </div>
        </div>

        <Card className="shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-serif flex items-center gap-2">
              {aiSummary ? (
                <>
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  AI-Enhanced Summary
                </>
              ) : (
                'Summary Report'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-xl p-5 text-base leading-relaxed">
              {aiSummary ? (
                <div className="prose prose-sm max-w-none">
                  <Streamdown>{aiSummary}</Streamdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{basicSummary}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleCopy}
              className="h-14 text-base font-semibold"
              variant={copied ? 'secondary' : 'default'}
            >
              {copied ? (
                <><CheckCircle2 className="mr-2 w-5 h-5" /> Copied</>
              ) : (
                <><Copy className="mr-2 w-5 h-5" /> Copy</>
              )}
            </Button>

            <Button
              onClick={handleDownload}
              variant="outline"
              className="h-14 text-base font-semibold"
            >
              <Download className="mr-2 w-5 h-5" />
              Download
            </Button>
          </div>

          {!aiSummary && (
            <Button
              onClick={handleAiSummary}
              variant="outline"
              className="w-full h-12 text-base border-purple-200 text-purple-700 hover:bg-purple-50"
              disabled={aiLoading}
            >
              {aiLoading ? (
                <>
                  <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                  Generating AI Summary...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 w-5 h-5" />
                  Generate AI-Enhanced Summary
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      <DisclaimerFooter />
    </div>
  );
}
