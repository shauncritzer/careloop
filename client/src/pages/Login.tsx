import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Loader2, Eye, EyeOff, Mail } from 'lucide-react';
import DisclaimerFooter from '@/components/DisclaimerFooter';

export default function Login() {
  const { isAuthenticated, loading, signInWithPin, signIn } = useSupabaseAuth();
  const [, setLocation] = useLocation();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const hasPin = !!localStorage.getItem('careloop_pin_hash');

  useEffect(() => {
    if (!loading && isAuthenticated) {
      setLocation('/');
    }
  }, [loading, isAuthenticated, setLocation]);

  useEffect(() => {
    if (!loading && !hasPin) {
      setLocation('/setup');
    }
  }, [loading, hasPin, setLocation]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setSubmitting(true);
    setError('');
    const { error: err } = await signInWithPin(pin);
    if (err) setError(err);
    else setLocation('/');
    setSubmitting(false);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setSubmitting(true);
    setError('');
    const { error: err } = await signIn(email, password);
    if (err) setError(err);
    else setLocation('/');
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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto">
              <Heart className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-serif font-semibold text-foreground">CareLoop</h1>
            <p className="text-muted-foreground text-lg">Welcome back</p>
          </div>

          {/* PIN Entry */}
          {!showEmailForm ? (
            <Card className="shadow-lg">
              <CardContent className="pt-8 pb-8">
                <form onSubmit={handlePinSubmit} className="space-y-6">
                  <div className="text-center mb-2">
                    <p className="text-base text-muted-foreground">Enter your PIN to continue</p>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-center text-base">
                      {error}
                    </div>
                  )}

                  <div className="relative">
                    <Input
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={pin}
                      onChange={(e) => { setPin(e.target.value); setError(''); }}
                      placeholder="Enter PIN"
                      className="h-16 text-2xl text-center font-semibold tracking-[0.3em] pr-12"
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

                  <Button
                    type="submit"
                    className="w-full h-14 text-lg font-semibold"
                    disabled={submitting || !pin.trim()}
                  >
                    {submitting ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Signing in...</>
                    ) : 'Sign In'}
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t border-border text-center">
                  <button
                    onClick={() => { setShowEmailForm(true); setError(''); }}
                    className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2 mx-auto min-h-[48px]"
                  >
                    <Mail className="w-4 h-4" />
                    Sign in with email instead (family access)
                  </button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Email Form (for family members) */
            <Card className="shadow-lg">
              <CardContent className="pt-8 pb-8">
                <form onSubmit={handleEmailSubmit} className="space-y-5">
                  <div className="text-center mb-2">
                    <p className="text-base font-medium">Family Member Sign In</p>
                    <p className="text-sm text-muted-foreground mt-1">Use your email and password</p>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-center text-sm">
                      {error}
                    </div>
                  )}

                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="h-12 text-base"
                    autoFocus
                  />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="h-12 text-base"
                  />

                  <Button
                    type="submit"
                    className="w-full h-14 text-lg font-semibold"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Signing in...</>
                    ) : 'Sign In'}
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t border-border text-center">
                  <button
                    onClick={() => { setShowEmailForm(false); setError(''); }}
                    className="text-sm text-muted-foreground hover:text-primary min-h-[48px]"
                  >
                    Back to PIN entry
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <DisclaimerFooter />
    </div>
  );
}
