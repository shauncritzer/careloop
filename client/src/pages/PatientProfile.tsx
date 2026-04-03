import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { usePatient, useSavePatient } from '@/hooks/useSupabaseData';
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
    date_of_birth: '',
    baseline_weight_lbs: '',
    baseline_sys_bp: '',
    baseline_dia_bp: '',
    baseline_pulse: '',
    baseline_spo2: '',
    caregiver_name: '',
    family_contact_name: '',
  });

  useEffect(() => {
    if (patient) {
      setForm({
        name: patient.name || '',
        date_of_birth: patient.date_of_birth || '',
        baseline_weight_lbs: patient.baseline_weight_lbs?.toString() || '',
        baseline_sys_bp: patient.baseline_sys_bp?.toString() || '',
        baseline_dia_bp: patient.baseline_dia_bp?.toString() || '',
        baseline_pulse: patient.baseline_pulse?.toString() || '',
        baseline_spo2: patient.baseline_spo2?.toString() || '',
        caregiver_name: patient.caregiver_name || '',
        family_contact_name: patient.family_contact_name || '',
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
      date_of_birth: form.date_of_birth || null,
      baseline_weight_lbs: form.baseline_weight_lbs ? parseFloat(form.baseline_weight_lbs) : null,
      baseline_sys_bp: form.baseline_sys_bp ? parseInt(form.baseline_sys_bp) : null,
      baseline_dia_bp: form.baseline_dia_bp ? parseInt(form.baseline_dia_bp) : null,
      baseline_pulse: form.baseline_pulse ? parseInt(form.baseline_pulse) : null,
      baseline_spo2: form.baseline_spo2 ? parseInt(form.baseline_spo2) : null,
      caregiver_name: form.caregiver_name || null,
      family_contact_name: form.family_contact_name || null,
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
                  value={form.date_of_birth}
                  onChange={(e) => updateField('date_of_birth', e.target.value)}
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
                Normal values for this patient — used to detect changes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium">Weight (lbs)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.baseline_weight_lbs}
                    onChange={(e) => updateField('baseline_weight_lbs', e.target.value)}
                    placeholder="e.g. 185"
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-medium">SpO2 (%)</Label>
                  <Input
                    type="number"
                    value={form.baseline_spo2}
                    onChange={(e) => updateField('baseline_spo2', e.target.value)}
                    placeholder="e.g. 96"
                    className="h-12 text-base"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium">Systolic BP</Label>
                  <Input
                    type="number"
                    value={form.baseline_sys_bp}
                    onChange={(e) => updateField('baseline_sys_bp', e.target.value)}
                    placeholder="e.g. 130"
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-medium">Diastolic BP</Label>
                  <Input
                    type="number"
                    value={form.baseline_dia_bp}
                    onChange={(e) => updateField('baseline_dia_bp', e.target.value)}
                    placeholder="e.g. 80"
                    className="h-12 text-base"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium">Resting Pulse (bpm)</Label>
                <Input
                  type="number"
                  value={form.baseline_pulse}
                  onChange={(e) => updateField('baseline_pulse', e.target.value)}
                  placeholder="e.g. 72"
                  className="h-12 text-base"
                />
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
                  value={form.caregiver_name}
                  onChange={(e) => updateField('caregiver_name', e.target.value)}
                  placeholder="Primary caregiver"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium">Family Contact Name</Label>
                <Input
                  value={form.family_contact_name}
                  onChange={(e) => updateField('family_contact_name', e.target.value)}
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
