import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { usePatient, useDailyLogs, useSaveDailyLog, useSaveAlert, getHistoricalData, getPatientBaseline } from '@/hooks/useSupabaseData';
import { useAlertNotification } from '@/hooks/useAlertNotification';
import { evaluateAlerts, getSeverityLabel, getSeverityColor } from '@/lib/alertEngine';
import type { DailyLogInput, AlertResult } from '@/lib/alertEngine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, Check, Loader2, AlertTriangle, CheckCircle2, XCircle, Weight, Heart, Wind, Pill, FileText, Activity } from 'lucide-react';
import DisclaimerFooter from '@/components/DisclaimerFooter';
import { toast } from 'sonner';

const TOTAL_STEPS = 7;

const symptomButtons = [
  { key: 'breathing_worse', label: 'Breathing Worse', icon: Wind },
  { key: 'mild_confusion', label: 'Mild Confusion', icon: Activity },
  { key: 'severe_confusion', label: 'Severe Confusion', icon: AlertTriangle },
  { key: 'stomach_pain_bent_over', label: 'Stomach Pain / Bent Over', icon: Activity },
  { key: 'swelling', label: 'Swelling', icon: Activity },
  { key: 'poor_sleep', label: 'Poor Sleep', icon: Activity },
  { key: 'weak_exhausted', label: 'Weak / Exhausted', icon: Activity },
  { key: 'poor_appetite', label: 'Poor Appetite', icon: Activity },
  { key: 'cough_worse', label: 'Cough Worse', icon: Wind },
  { key: 'fall_or_near_fall', label: 'Fall or Near Fall', icon: AlertTriangle },
] as const;

export default function DailyCheckIn() {
  const [, setLocation] = useLocation();
  const { patient, loading: patientLoading } = usePatient();
  const { logs } = useDailyLogs(patient?.id, 8);
  const { saveDailyLog } = useSaveDailyLog();
  const { saveAlert } = useSaveAlert();
  const { notifyOnAlert } = useAlertNotification();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [alertResult, setAlertResult] = useState<AlertResult | null>(null);

  const [form, setForm] = useState<DailyLogInput & { med_note: string; general_note: string }>({
    weight_lbs: null,
    systolic_bp: null,
    diastolic_bp: null,
    pulse_bpm: null,
    spo2: null,
    breathing_worse: false,
    mild_confusion: false,
    severe_confusion: false,
    stomach_pain_bent_over: false,
    swelling: false,
    poor_sleep: false,
    weak_exhausted: false,
    poor_appetite: false,
    cough_worse: false,
    fall_or_near_fall: false,
    lasix_taken: true,
    all_meds_taken: true,
    ambien_taken_last_night: false,
    med_note: '',
    general_note: '',
  });

  const updateNumeric = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value === '' ? null : parseFloat(value) }));
  };

  const toggleBool = (field: string) => {
    setForm(prev => ({ ...prev, [field]: !(prev as any)[field] }));
  };

  const handleSubmit = async () => {
    if (!patient) return;
    setSubmitting(true);

    const historicalData = getHistoricalData(logs);
    const baseline = getPatientBaseline(patient);
    const result = evaluateAlerts(form, baseline, historicalData);
    setAlertResult(result);

    // Save daily log
    const { data: savedLog, error } = await saveDailyLog({
      patient_id: patient.id,
      ...form,
    });

    if (error) {
      toast.error('Failed to save check-in: ' + error);
      setSubmitting(false);
      return;
    }

    // Save alert
    if (savedLog) {
      await saveAlert({
        patient_id: patient.id,
        daily_log_id: savedLog.id,
        severity: result.severity,
        message: result.messages.join(' | '),
      });

      // Send automated notifications for concerning patterns
      await notifyOnAlert(patient.name, result, patient.id);
    }

    setStep(7);
    setSubmitting(false);
  };

  const canAdvance = () => {
    switch (step) {
      case 1: return form.weight_lbs != null;
      case 2: return form.systolic_bp != null && form.diastolic_bp != null && form.pulse_bpm != null;
      case 3: return form.spo2 != null;
      default: return true;
    }
  };

  const nextStep = () => {
    if (step === 6) {
      handleSubmit();
    } else if (step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  if (patientLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <Card className="max-w-md w-full shadow-sm">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <h2 className="text-xl font-serif font-semibold">No Patient Profile</h2>
            <p className="text-muted-foreground">Please set up a patient profile first.</p>
            <Button onClick={() => setLocation('/patient-profile')} className="h-12 text-base">
              Set Up Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 container max-w-lg py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => step === 7 ? setLocation('/') : (step > 1 ? prevStep() : setLocation('/'))}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground min-h-[48px]"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-base">{step === 7 ? 'Home' : step > 1 ? 'Back' : 'Cancel'}</span>
          </button>
          {step < 7 && (
            <span className="text-sm text-muted-foreground font-medium">
              Step {step} of 6
            </span>
          )}
        </div>

        {/* Progress bar */}
        {step < 7 && (
          <div className="w-full h-2 bg-muted rounded-full mb-8 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(step / 6) * 100}%` }}
            />
          </div>
        )}

        {/* Step 1: Weight */}
        {step === 1 && (
          <Card className="shadow-sm">
            <CardHeader className="text-center pb-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mx-auto mb-3">
                <Weight className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-2xl font-serif">Weight</CardTitle>
              <p className="text-muted-foreground text-base mt-1">{today}</p>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-base font-medium">Today's Weight (lbs)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.weight_lbs ?? ''}
                  onChange={(e) => updateNumeric('weight_lbs', e.target.value)}
                  placeholder="e.g. 187"
                  className="h-14 text-xl text-center font-semibold"
                  autoFocus
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: BP + Pulse */}
        {step === 2 && (
          <Card className="shadow-sm">
            <CardHeader className="text-center pb-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mx-auto mb-3">
                <Heart className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-2xl font-serif">Blood Pressure & Pulse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium">Systolic</Label>
                  <Input
                    type="number"
                    value={form.systolic_bp ?? ''}
                    onChange={(e) => updateNumeric('systolic_bp', e.target.value)}
                    placeholder="e.g. 130"
                    className="h-14 text-xl text-center font-semibold"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-medium">Diastolic</Label>
                  <Input
                    type="number"
                    value={form.diastolic_bp ?? ''}
                    onChange={(e) => updateNumeric('diastolic_bp', e.target.value)}
                    placeholder="e.g. 80"
                    className="h-14 text-xl text-center font-semibold"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium">Pulse (bpm)</Label>
                <Input
                  type="number"
                  value={form.pulse_bpm ?? ''}
                  onChange={(e) => updateNumeric('pulse_bpm', e.target.value)}
                  placeholder="e.g. 72"
                  className="h-14 text-xl text-center font-semibold"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: SpO2 */}
        {step === 3 && (
          <Card className="shadow-sm">
            <CardHeader className="text-center pb-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mx-auto mb-3">
                <Wind className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-2xl font-serif">Oxygen Level</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-base font-medium">SpO2 (%)</Label>
                <Input
                  type="number"
                  value={form.spo2 ?? ''}
                  onChange={(e) => updateNumeric('spo2', e.target.value)}
                  placeholder="e.g. 96"
                  className="h-14 text-xl text-center font-semibold"
                  autoFocus
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Symptoms */}
        {step === 4 && (
          <Card className="shadow-sm">
            <CardHeader className="text-center pb-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mx-auto mb-3">
                <Activity className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-2xl font-serif">Symptoms</CardTitle>
              <p className="text-muted-foreground text-base mt-1">Tap any that apply today</p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 gap-3">
                {symptomButtons.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleBool(key)}
                    className={`w-full min-h-[56px] px-4 py-3 rounded-xl text-left text-base font-medium transition-all border-2 ${
                      (form as any)[key]
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-card border-border text-foreground hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{label}</span>
                      {(form as any)[key] && <Check className="w-5 h-5" />}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Medications */}
        {step === 5 && (
          <Card className="shadow-sm">
            <CardHeader className="text-center pb-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mx-auto mb-3">
                <Pill className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-2xl font-serif">Medications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {[
                { key: 'lasix_taken', label: 'Lasix taken today?' },
                { key: 'all_meds_taken', label: 'All medications taken?' },
                { key: 'ambien_taken_last_night', label: 'Ambien taken last night?' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between p-4 rounded-xl border-2 border-border">
                  <span className="text-base font-medium">{label}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, [key]: true }))}
                      className={`min-w-[64px] min-h-[48px] px-4 py-2 rounded-lg text-base font-semibold transition-all ${
                        (form as any)[key]
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, [key]: false }))}
                      className={`min-w-[64px] min-h-[48px] px-4 py-2 rounded-lg text-base font-semibold transition-all ${
                        !(form as any)[key]
                          ? 'bg-destructive text-destructive-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              ))}
              <div className="space-y-2 pt-2">
                <Label className="text-base font-medium">Medication Note (optional)</Label>
                <Textarea
                  value={form.med_note}
                  onChange={(e) => setForm(prev => ({ ...prev, med_note: e.target.value }))}
                  placeholder="Any notes about medications..."
                  className="text-base min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 6: General Note */}
        {step === 6 && (
          <Card className="shadow-sm">
            <CardHeader className="text-center pb-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mx-auto mb-3">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-2xl font-serif">General Notes</CardTitle>
              <p className="text-muted-foreground text-base mt-1">Any other observations today</p>
            </CardHeader>
            <CardContent className="pt-4">
              <Textarea
                value={form.general_note}
                onChange={(e) => setForm(prev => ({ ...prev, general_note: e.target.value }))}
                placeholder="How is the patient feeling overall? Any changes in behavior, mood, or daily activities..."
                className="text-base min-h-[160px]"
              />
            </CardContent>
          </Card>
        )}

        {/* Step 7: Result */}
        {step === 7 && alertResult && (
          <div className="space-y-6">
            <Card className={`shadow-lg border-2 ${
              alertResult.severity === 'red' ? 'border-red-300' :
              alertResult.severity === 'yellow' ? 'border-amber-300' :
              'border-emerald-300'
            }`}>
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${
                  alertResult.severity === 'red' ? 'bg-red-100' :
                  alertResult.severity === 'yellow' ? 'bg-amber-100' :
                  'bg-emerald-100'
                }`}>
                  {alertResult.severity === 'red' && <XCircle className="w-10 h-10 text-red-600" />}
                  {alertResult.severity === 'yellow' && <AlertTriangle className="w-10 h-10 text-amber-600" />}
                  {alertResult.severity === 'green' && <CheckCircle2 className="w-10 h-10 text-emerald-600" />}
                </div>
                <h2 className={`text-2xl font-serif font-semibold ${
                  alertResult.severity === 'red' ? 'text-red-700' :
                  alertResult.severity === 'yellow' ? 'text-amber-700' :
                  'text-emerald-700'
                }`}>
                  {getSeverityLabel(alertResult.severity)}
                </h2>
                <div className="space-y-2 text-left max-w-sm mx-auto">
                  {alertResult.messages.map((msg, i) => (
                    <p key={i} className="text-base text-foreground leading-relaxed">
                      {msg}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => setLocation('/')}
                className="w-full h-14 text-lg font-semibold"
              >
                Return to Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation('/trends')}
                className="w-full h-12 text-base"
              >
                View Trends
              </Button>
            </div>
          </div>
        )}

        {/* Navigation buttons (steps 1-6) */}
        {step < 7 && (
          <div className="mt-8 flex gap-3">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={prevStep}
                className="h-14 text-base font-semibold flex-1"
              >
                <ArrowLeft className="mr-2 w-5 h-5" />
                Back
              </Button>
            )}
            <Button
              onClick={nextStep}
              disabled={!canAdvance() || submitting}
              className="h-14 text-base font-semibold flex-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : step === 6 ? (
                <>
                  <Check className="mr-2 w-5 h-5" />
                  Complete Check-in
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
      <DisclaimerFooter />
    </div>
  );
}
