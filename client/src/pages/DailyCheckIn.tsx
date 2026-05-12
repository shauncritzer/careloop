import { useState, useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';
import { usePatient, useDailyLogs, useSaveDailyLog, useSaveAlert, getBaselineData, logToCheckInData } from '@/hooks/useCareData';
import { evaluateCheckIn, getSeverityLabel, getSeverityColor } from '@/lib/alertEngine';
import type { Severity, CheckInData } from '@/lib/alertEngine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, ArrowRight, Loader2, Scale, Heart, Activity,
  Droplets, AlertTriangle, CheckCircle2, XCircle, Stethoscope,
  Utensils, Moon, Wind, Brain, Pill, ChevronRight
} from 'lucide-react';
import DisclaimerFooter from '@/components/DisclaimerFooter';
import { toast } from 'sonner';

interface FormData {
  weight_lbs: string;
  systolic_bp: string;
  diastolic_bp: string;
  pulse_bpm: string;
  spo2: string;
  fluid_intake_oz: string;
  sodium_mg: string;
  breathing_worse: boolean;
  swelling: boolean;
  confusion: boolean;
  dizziness: boolean;
  chest_pain: boolean;
  missed_meds: boolean;
  fall_or_near_fall: boolean;
  poor_appetite: boolean;
  poor_sleep: boolean;
  notes: string;
}

const defaultForm: FormData = {
  weight_lbs: '', systolic_bp: '', diastolic_bp: '', pulse_bpm: '', spo2: '',
  fluid_intake_oz: '', sodium_mg: '',
  breathing_worse: false, swelling: false, confusion: false, dizziness: false,
  chest_pain: false, missed_meds: false, fall_or_near_fall: false,
  poor_appetite: false, poor_sleep: false, notes: '',
};

function SymptomToggle({ label, icon: Icon, checked, onChange }: {
  label: string; icon: React.ElementType; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all min-h-[56px] w-full text-left ${
        checked
          ? 'border-amber-400 bg-amber-50 text-amber-800'
          : 'border-border bg-card text-foreground hover:border-muted-foreground/30'
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 ${checked ? 'text-amber-600' : 'text-muted-foreground'}`} />
      <span className="text-base font-medium flex-1">{label}</span>
      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
        checked ? 'border-amber-500 bg-amber-500' : 'border-muted-foreground/30'
      }`}>
        {checked && <CheckCircle2 className="w-4 h-4 text-white" />}
      </div>
    </button>
  );
}

export default function DailyCheckIn() {
  const [, setLocation] = useLocation();
  const { patient, loading: patientLoading } = usePatient();
  const { logs } = useDailyLogs(patient?.id, 7);
  const { saveDailyLog } = useSaveDailyLog();
  const { saveAlert } = useSaveAlert();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ severity: Severity; messages: string[]; recommendations: string[] } | null>(null);

  const updateField = useCallback((field: keyof FormData, value: string | boolean) => {
    setForm((prev: FormData) => ({ ...prev, [field]: value }));
  }, []);

  const steps = [
    { title: 'Vitals', subtitle: 'Weight, blood pressure, pulse, oxygen' },
    { title: 'How are they feeling?', subtitle: 'Symptoms to watch for' },
    { title: 'Medications', subtitle: 'Were all meds taken today?' },
    { title: 'Fluid & Sodium', subtitle: 'Tracking intake limits' },
    { title: 'Notes', subtitle: 'Anything else to record' },
  ];

  const canProceed = useMemo(() => {
    if (step === 0) return form.weight_lbs.trim() !== '';
    return true;
  }, [step, form.weight_lbs]);

  const handleSubmit = async () => {
    if (!patient) return;
    setSubmitting(true);

    const logData = {
      patientId: patient.id,
      weightLbs: form.weight_lbs ? parseFloat(form.weight_lbs) : null,
      systolicBp: form.systolic_bp ? parseInt(form.systolic_bp) : null,
      diastolicBp: form.diastolic_bp ? parseInt(form.diastolic_bp) : null,
      pulseBpm: form.pulse_bpm ? parseInt(form.pulse_bpm) : null,
      spo2: form.spo2 ? parseInt(form.spo2) : null,
      fluidIntakeOz: form.fluid_intake_oz ? parseFloat(form.fluid_intake_oz) : null,
      sodiumMg: form.sodium_mg ? parseInt(form.sodium_mg) : null,
      breathingWorse: form.breathing_worse,
      swelling: form.swelling,
      confusion: form.confusion,
      dizziness: form.dizziness,
      chestPain: form.chest_pain,
      missedMeds: form.missed_meds,
      fallOrNearFall: form.fall_or_near_fall,
      poorAppetite: form.poor_appetite,
      poorSleep: form.poor_sleep,
      notes: form.notes || null,
    };

    const { error } = await saveDailyLog(logData);
    if (error) {
      toast.error('Failed to save check-in: ' + error);
      setSubmitting(false);
      return;
    }

    // Run alert engine
    const checkInData: CheckInData = {
      weight_lbs: logData.weightLbs,
      systolic_bp: logData.systolicBp,
      diastolic_bp: logData.diastolicBp,
      pulse_bpm: logData.pulseBpm,
      spo2: logData.spo2,
      fluid_intake_oz: logData.fluidIntakeOz,
      sodium_mg: logData.sodiumMg,
      breathing_worse: logData.breathingWorse,
      swelling: logData.swelling,
      confusion: logData.confusion,
      dizziness: logData.dizziness,
      chest_pain: logData.chestPain,
      missed_meds: logData.missedMeds,
      fall_or_near_fall: logData.fallOrNearFall,
      poor_appetite: logData.poorAppetite,
      poor_sleep: logData.poorSleep,
      notes: logData.notes,
    };

    const previousCheckIns = logs.map(logToCheckInData);
    const baseline = getBaselineData(patient);
    const alertResult = evaluateCheckIn(checkInData, baseline, previousCheckIns);

    await saveAlert(patient.id, alertResult.severity, alertResult.messages, alertResult.recommendations);

    setResult(alertResult);
    setStep(steps.length);
    setSubmitting(false);
  };

  if (patientLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="py-10 text-center space-y-4">
            <p className="text-lg text-muted-foreground">Please set up a patient profile first.</p>
            <Button onClick={() => setLocation('/patient-profile')}>Set Up Profile</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Result screen
  if (result) {
    const colors = getSeverityColor(result.severity);
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex-1 container max-w-lg py-8 space-y-6">
          <div className="text-center space-y-4">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl ${
              result.severity === 'red' ? 'bg-red-100' :
              result.severity === 'yellow' ? 'bg-amber-100' : 'bg-emerald-100'
            }`}>
              {result.severity === 'red' && <XCircle className="w-10 h-10 text-red-600" />}
              {result.severity === 'yellow' && <AlertTriangle className="w-10 h-10 text-amber-600" />}
              {result.severity === 'green' && <CheckCircle2 className="w-10 h-10 text-emerald-600" />}
            </div>
            <h1 className={`text-2xl font-serif font-semibold ${colors.text}`}>
              {getSeverityLabel(result.severity)}
            </h1>
          </div>

          <Card className={`shadow-lg border-2 ${colors.border} ${colors.bg}`}>
            <CardContent className="py-5">
              <div className="space-y-3">
                {result.messages.map((msg, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${colors.dot}`} />
                    <p className={`text-base ${colors.text}`}>{msg}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {result.recommendations.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-serif">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <ChevronRight className="w-4 h-4 mt-1 text-primary shrink-0" />
                      <p className="text-base text-foreground/80">{rec}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Button onClick={() => setLocation('/')} className="w-full h-14 text-lg font-semibold">
            Back to Dashboard
          </Button>
        </div>
        <DisclaimerFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 container max-w-lg py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => step === 0 ? setLocation('/') : setStep(step - 1)}
            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-serif font-semibold">{steps[step].title}</h1>
            <p className="text-sm text-muted-foreground">{steps[step].subtitle}</p>
          </div>
          <span className="text-sm text-muted-foreground font-medium">{step + 1} / {steps.length}</span>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        {/* Step 0: Vitals */}
        {step === 0 && (
          <div className="space-y-5">
            <Card className="shadow-sm border-primary/20">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3 mb-4">
                  <Scale className="w-5 h-5 text-primary" />
                  <Label className="text-lg font-semibold">Weight (lbs) *</Label>
                </div>
                <Input
                  type="number"
                  step="0.1"
                  value={form.weight_lbs}
                  onChange={(e) => updateField('weight_lbs', e.target.value)}
                  placeholder="e.g. 185"
                  className="h-14 text-xl text-center font-semibold"
                  autoFocus
                />
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  This is the most important daily measurement for CHF
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="pt-5 pb-5 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <Stethoscope className="w-5 h-5 text-primary" />
                  <Label className="text-lg font-semibold">Blood Pressure</Label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">Systolic (top)</Label>
                    <Input
                      type="number"
                      value={form.systolic_bp}
                      onChange={(e) => updateField('systolic_bp', e.target.value)}
                      placeholder="e.g. 130"
                      className="h-12 text-lg text-center font-medium mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Diastolic (bottom)</Label>
                    <Input
                      type="number"
                      value={form.diastolic_bp}
                      onChange={(e) => updateField('diastolic_bp', e.target.value)}
                      placeholder="e.g. 80"
                      className="h-12 text-lg text-center font-medium mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="pt-5 pb-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-4 h-4 text-primary" />
                      <Label className="text-base font-semibold">Pulse (bpm)</Label>
                    </div>
                    <Input
                      type="number"
                      value={form.pulse_bpm}
                      onChange={(e) => updateField('pulse_bpm', e.target.value)}
                      placeholder="e.g. 72"
                      className="h-12 text-lg text-center font-medium"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-primary" />
                      <Label className="text-base font-semibold">SpO2 (%)</Label>
                    </div>
                    <Input
                      type="number"
                      value={form.spo2}
                      onChange={(e) => updateField('spo2', e.target.value)}
                      placeholder="e.g. 96"
                      className="h-12 text-lg text-center font-medium"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 1: Symptoms */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-base text-muted-foreground mb-4">
              Tap any symptoms that apply today. Leave unchecked if not present.
            </p>
            <SymptomToggle label="Breathing is worse than usual" icon={Wind} checked={form.breathing_worse} onChange={(v) => updateField('breathing_worse', v)} />
            <SymptomToggle label="Swelling (ankles, legs, abdomen)" icon={Droplets} checked={form.swelling} onChange={(v) => updateField('swelling', v)} />
            <SymptomToggle label="Confusion or disorientation" icon={Brain} checked={form.confusion} onChange={(v) => updateField('confusion', v)} />
            <SymptomToggle label="Dizziness or lightheadedness" icon={Activity} checked={form.dizziness} onChange={(v) => updateField('dizziness', v)} />
            <SymptomToggle label="Chest pain or pressure" icon={Heart} checked={form.chest_pain} onChange={(v) => updateField('chest_pain', v)} />
            <SymptomToggle label="Fall or near-fall" icon={AlertTriangle} checked={form.fall_or_near_fall} onChange={(v) => updateField('fall_or_near_fall', v)} />
            <SymptomToggle label="Poor appetite" icon={Utensils} checked={form.poor_appetite} onChange={(v) => updateField('poor_appetite', v)} />
            <SymptomToggle label="Poor sleep / trouble sleeping flat" icon={Moon} checked={form.poor_sleep} onChange={(v) => updateField('poor_sleep', v)} />
          </div>
        )}

        {/* Step 2: Medications */}
        {step === 2 && (
          <div className="space-y-4">
            <Card className="shadow-sm">
              <CardContent className="pt-6 pb-6">
                <p className="text-lg text-center mb-6">Were all medications taken today?</p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => updateField('missed_meds', false)}
                    className={`p-6 rounded-xl border-2 text-center transition-all ${
                      !form.missed_meds
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                        : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/30'
                    }`}
                  >
                    <CheckCircle2 className={`w-8 h-8 mx-auto mb-2 ${!form.missed_meds ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                    <p className="text-lg font-semibold">Yes, all taken</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('missed_meds', true)}
                    className={`p-6 rounded-xl border-2 text-center transition-all ${
                      form.missed_meds
                        ? 'border-amber-400 bg-amber-50 text-amber-800'
                        : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/30'
                    }`}
                  >
                    <Pill className={`w-8 h-8 mx-auto mb-2 ${form.missed_meds ? 'text-amber-600' : 'text-muted-foreground'}`} />
                    <p className="text-lg font-semibold">Some missed</p>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Fluid & Sodium */}
        {step === 3 && (
          <div className="space-y-5">
            <Card className="shadow-sm">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3 mb-3">
                  <Droplets className="w-5 h-5 text-blue-500" />
                  <Label className="text-lg font-semibold">Fluid Intake (oz)</Label>
                </div>
                <Input
                  type="number"
                  step="1"
                  value={form.fluid_intake_oz}
                  onChange={(e) => updateField('fluid_intake_oz', e.target.value)}
                  placeholder="Estimated ounces today"
                  className="h-14 text-xl text-center font-semibold"
                />
                {patient.fluidLimitOz && (
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Daily limit: {patient.fluidLimitOz} oz
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  Tip: 1 cup = 8 oz, 1 water bottle = ~16 oz
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3 mb-3">
                  <Utensils className="w-5 h-5 text-orange-500" />
                  <Label className="text-lg font-semibold">Sodium Intake (mg)</Label>
                </div>
                <Input
                  type="number"
                  step="100"
                  value={form.sodium_mg}
                  onChange={(e) => updateField('sodium_mg', e.target.value)}
                  placeholder="Estimated mg today"
                  className="h-14 text-xl text-center font-semibold"
                />
                {patient.sodiumLimitMg && (
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Daily limit: {patient.sodiumLimitMg} mg
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  Tip: Check nutrition labels. Most CHF patients aim for under 1500-2000mg/day.
                </p>
              </CardContent>
            </Card>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                <strong>Don't worry about exact numbers.</strong> An estimate is better than nothing.
                Your doctor can help set specific limits.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Notes */}
        {step === 4 && (
          <div className="space-y-5">
            <Card className="shadow-sm">
              <CardContent className="pt-5 pb-5">
                <Label className="text-lg font-semibold mb-3 block">
                  Anything else to note today?
                </Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="How is he doing overall? Any changes? Anything the doctor should know?"
                  className="min-h-[150px] text-base"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Optional — but helpful for doctor visits and tracking patterns
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="h-14 text-base font-semibold flex-1"
            >
              <ArrowLeft className="mr-2 w-5 h-5" />
              Back
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              className="h-14 text-base font-semibold flex-1"
              disabled={!canProceed}
            >
              Next
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="h-14 text-base font-semibold flex-1"
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 className="mr-2 w-5 h-5 animate-spin" /> Saving...</>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 w-5 h-5" />
                  Complete Check-in
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
