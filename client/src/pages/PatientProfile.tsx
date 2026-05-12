import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { usePatient, useSavePatient } from '@/hooks/useCareData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Save, User } from 'lucide-react';
import DisclaimerFooter from '@/components/DisclaimerFooter';
import { toast } from 'sonner';

export default function PatientProfile() {
  const { patient, loading: patientLoading } = usePatient();
  const { savePatient } = useSavePatient();
  const [, setLocation] = useLocation();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    dateOfBirth: '',
    baselineWeightLbs: '',
    baselineSysBp: '',
    baselineDiaBp: '',
    baselinePulse: '',
    baselineSpo2: '',
    fluidLimitOz: '',
    sodiumLimitMg: '',
    caregiverName: '',
    familyContactName: '',
  });

  useEffect(() => {
    if (patient) {
      setForm({
        name: patient.name || '',
        dateOfBirth: patient.dateOfBirth || '',
        baselineWeightLbs: patient.baselineWeightLbs?.toString() || '',
        baselineSysBp: patient.baselineSysBp?.toString() || '',
        baselineDiaBp: patient.baselineDiaBp?.toString() || '',
        baselinePulse: patient.baselinePulse?.toString() || '',
        baselineSpo2: patient.baselineSpo2?.toString() || '',
        fluidLimitOz: patient.fluidLimitOz?.toString() || '',
        sodiumLimitMg: patient.sodiumLimitMg?.toString() || '',
        caregiverName: patient.caregiverName || '',
        familyContactName: patient.familyContactName || '',
      });
    }
  }, [patient]);

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await savePatient({
      name: form.name,
      dateOfBirth: form.dateOfBirth || undefined,
      baselineWeightLbs: form.baselineWeightLbs ? parseFloat(form.baselineWeightLbs) : undefined,
      baselineSysBp: form.baselineSysBp ? parseInt(form.baselineSysBp) : undefined,
      baselineDiaBp: form.baselineDiaBp ? parseInt(form.baselineDiaBp) : undefined,
      baselinePulse: form.baselinePulse ? parseInt(form.baselinePulse) : undefined,
      baselineSpo2: form.baselineSpo2 ? parseInt(form.baselineSpo2) : undefined,
      fluidLimitOz: form.fluidLimitOz ? parseFloat(form.fluidLimitOz) : undefined,
      sodiumLimitMg: form.sodiumLimitMg ? parseInt(form.sodiumLimitMg) : undefined,
      caregiverName: form.caregiverName || undefined,
      familyContactName: form.familyContactName || undefined,
    });

    if (error) {
      toast.error(error);
    } else {
      toast.success('Patient profile saved successfully');
      setLocation('/');
    }
    setSubmitting(false);
  };

  if (patientLoading) {
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
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-semibold">Patient Profile</h1>
            <p className="text-muted-foreground">
              {patient ? 'Update patient information' : 'Set up your patient\'s profile'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-serif">Basic Information</CardTitle>
              <CardDescription>Patient's personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-medium">Patient Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Full name"
                  required
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium">Date of Birth</Label>
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => updateField('dateOfBirth', e.target.value)}
                  className="h-12 text-base"
                />
              </div>
            </CardContent>
          </Card>

          {/* Baseline Vitals */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-serif">Baseline Vitals</CardTitle>
              <CardDescription>
                Normal values for this patient — used to detect changes. Ask the doctor for these if you're not sure.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium">Dry Weight (lbs)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.baselineWeightLbs}
                    onChange={(e) => updateField('baselineWeightLbs', e.target.value)}
                    placeholder="e.g. 185"
                    className="h-12 text-base"
                  />
                  <p className="text-xs text-muted-foreground">Weight without extra fluid — ask the doctor</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-medium">SpO2 (%)</Label>
                  <Input
                    type="number"
                    value={form.baselineSpo2}
                    onChange={(e) => updateField('baselineSpo2', e.target.value)}
                    placeholder="e.g. 96"
                    className="h-12 text-base"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium">Systolic BP (top number)</Label>
                  <Input
                    type="number"
                    value={form.baselineSysBp}
                    onChange={(e) => updateField('baselineSysBp', e.target.value)}
                    placeholder="e.g. 130"
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-medium">Diastolic BP (bottom number)</Label>
                  <Input
                    type="number"
                    value={form.baselineDiaBp}
                    onChange={(e) => updateField('baselineDiaBp', e.target.value)}
                    placeholder="e.g. 80"
                    className="h-12 text-base"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium">Resting Pulse (bpm)</Label>
                <Input
                  type="number"
                  value={form.baselinePulse}
                  onChange={(e) => updateField('baselinePulse', e.target.value)}
                  placeholder="e.g. 72"
                  className="h-12 text-base"
                />
              </div>
            </CardContent>
          </Card>

          {/* Fluid & Sodium Limits */}
          <Card className="shadow-sm border-blue-200">
            <CardHeader>
              <CardTitle className="text-xl font-serif">Fluid & Sodium Limits</CardTitle>
              <CardDescription>
                Daily limits prescribed by the doctor. These are critical for CHF management.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium">Fluid Limit (oz/day)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={form.fluidLimitOz}
                    onChange={(e) => updateField('fluidLimitOz', e.target.value)}
                    placeholder="e.g. 64"
                    className="h-12 text-base"
                  />
                  <p className="text-xs text-muted-foreground">Common CHF limit: 48-64 oz (6-8 cups)</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-medium">Sodium Limit (mg/day)</Label>
                  <Input
                    type="number"
                    step="100"
                    value={form.sodiumLimitMg}
                    onChange={(e) => updateField('sodiumLimitMg', e.target.value)}
                    placeholder="e.g. 1500"
                    className="h-12 text-base"
                  />
                  <p className="text-xs text-muted-foreground">Common CHF limit: 1500-2000 mg/day</p>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-sm text-blue-800">
                  If you don't know these limits yet, leave them blank and ask the doctor at the next visit. You can update them anytime.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contacts */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-serif">Care Team</CardTitle>
              <CardDescription>Names of primary contacts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-medium">Caregiver Name</Label>
                <Input
                  value={form.caregiverName}
                  onChange={(e) => updateField('caregiverName', e.target.value)}
                  placeholder="Primary caregiver"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium">Family Contact Name</Label>
                <Input
                  value={form.familyContactName}
                  onChange={(e) => updateField('familyContactName', e.target.value)}
                  placeholder="Emergency family contact"
                  className="h-12 text-base"
                />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full h-14 text-lg font-semibold"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                {patient ? 'Update Profile' : 'Save Profile'}
              </>
            )}
          </Button>
        </form>
      </div>
      <DisclaimerFooter />
    </div>
  );
}
