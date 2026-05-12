import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useSupabaseAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import DisclaimerFooter from '@/components/DisclaimerFooter';

export default function Setup() {
  const { isAuthenticated, loading, setupPin } = useSupabaseAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'name' | 'pin'>('name');
  const [caregiverName, setCaregiverName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      setLocation('/');
    }
  }, [loading, isAuthenticated, setLocation]);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caregiverName.trim()) return;
    setStep('pin');
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setSubmitting(true);
    const { error: err } = await setupPin(pin, caregiverName.trim());
    if (err) {
      setError(err);
    } else {
      setLocation('/patient-profile');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mx-auto">
              <Heart className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-serif font-semibold text-foreground">Welcome to CareLoop</h1>
            <p className="text-muted-foreground text-lg">
              Let's get you set up in under a minute
            </p>
          </div>

          {step === 'name' ? (
            <Card className="shadow-lg">
              <CardContent className="pt-8 pb-8">
                <form onSubmit={handleNameSubmit} className="space-y-6">
                  <div className="text-center mb-2">
                    <p className="text-xl font-serif font-semibold">What's your name?</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      This helps personalize the app for you as the caregiver
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base font-medium">Your Name</Label>
                    <Input
                      value={caregiverName}
                      onChange={(e) => setCaregiverName(e.target.value)}
                      placeholder="e.g. Mom, Sarah, etc."
                      className="h-14 text-lg"
                      autoFocus
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-14 text-lg font-semibold"
                    disabled={!caregiverName.trim()}
                  >
                    Continue
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-lg">
              <CardContent className="pt-8 pb-8">
                <form onSubmit={handlePinSubmit} className="space-y-6">
                  <div className="text-center mb-2">
                    <p className="text-xl font-serif font-semibold">Create a PIN</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      A simple 4+ digit PIN to keep your data private.
                      No email needed.
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-center text-base">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-base font-medium">PIN</Label>
                      <div className="relative">
                        <Input
                          type={showPin ? 'text' : 'password'}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={pin}
                          onChange={(e) => { setPin(e.target.value); setError(''); }}
                          placeholder="At least 4 digits"
                          className="h-14 text-xl text-center font-semibold tracking-[0.3em] pr-12"
                          autoFocus
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-base font-medium">Confirm PIN</Label>
                      <Input
                        type={showPin ? 'text' : 'password'}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={confirmPin}
                        onChange={(e) => { setConfirmPin(e.target.value); setError(''); }}
                        placeholder="Re-enter PIN"
                        className="h-14 text-xl text-center font-semibold tracking-[0.3em]"
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-14 text-lg font-semibold"
                    disabled={submitting || pin.length < 4}
                  >
                    {submitting ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Setting up...</>
                    ) : (
                      <>
                        Get Started
                        <ArrowRight className="ml-2 w-5 h-5" />
                      </>
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setStep('name')}
                    className="w-full text-sm text-muted-foreground hover:text-primary min-h-[48px]"
                  >
                    Back
                  </button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <DisclaimerFooter />
    </div>
  );
}
