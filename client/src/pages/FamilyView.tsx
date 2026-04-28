import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { usePatient, useDailyLogs, useAlerts, useFamilyAccess, useFamilyReadAccess } from '@/hooks/useSupabaseData';
import { getSeverityLabel, getSeverityColor } from '@/lib/alertEngine';
import type { Severity } from '@/lib/alertEngine';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, Loader2, Users, UserPlus, AlertTriangle, CheckCircle2, XCircle,
  Heart, Calendar, Mail, Copy, Share2
} from 'lucide-react';
import DisclaimerFooter from '@/components/DisclaimerFooter';
import { toast } from 'sonner';

// Family read-only dashboard for invited members
function FamilyReadOnlyDashboard({ patientId }: { patientId: string }) {
  const { logs } = useDailyLogs(patientId, 7);
  const { alerts } = useAlerts(patientId, 10);
  const [patientName, setPatientName] = useState('Patient');

  useEffect(() => {
    supabase.from('patients').select('name').eq('id', patientId).single().then(({ data }) => {
      if (data) setPatientName(data.name);
    });
  }, [patientId]);

  const latestAlert = alerts[0];
  const currentSeverity: Severity = (latestAlert?.severity as Severity) || 'green';
  const colors = getSeverityColor(currentSeverity);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-semibold text-foreground">{patientName}</h1>
        <p className="text-muted-foreground text-base flex items-center gap-2 mt-1">
          <Calendar className="w-4 h-4" />
          {today}
        </p>
        <p className="text-sm text-muted-foreground mt-1 italic">Family view — read only</p>
      </div>

      {/* Status Card */}
      <Card className={`shadow-lg border-2 ${colors.border} ${colors.bg}`}>
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              currentSeverity === 'red' ? 'bg-red-100' :
              currentSeverity === 'yellow' ? 'bg-amber-100' : 'bg-emerald-100'
            }`}>
              {currentSeverity === 'red' && <XCircle className="w-8 h-8 text-red-600" />}
              {currentSeverity === 'yellow' && <AlertTriangle className="w-8 h-8 text-amber-600" />}
              {currentSeverity === 'green' && <CheckCircle2 className="w-8 h-8 text-emerald-600" />}
            </div>
            <div className="flex-1">
              <h2 className={`text-xl font-serif font-semibold ${colors.text}`}>
                {getSeverityLabel(currentSeverity)}
              </h2>
              <p className={`text-sm mt-1 ${colors.text} opacity-80`}>
                {latestAlert ? `Last check-in: ${new Date(latestAlert.created_at).toLocaleDateString()}` : 'No check-ins yet'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div>
          <h3 className="text-lg font-serif font-semibold mb-3">Recent Alerts</h3>
          <div className="space-y-2">
            {alerts.slice(0, 7).map(alert => {
              const ac = getSeverityColor(alert.severity as Severity);
              return (
                <div key={alert.id} className={`p-3 rounded-xl border ${ac.border} ${ac.bg}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${ac.dot}`} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${ac.text}`}>
                        {getSeverityLabel(alert.severity as Severity)}
                      </p>
                      <p className="text-sm text-foreground/70 mt-0.5">
                        {alert.message.split(' | ')[0]}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(alert.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Vitals */}
      {logs.length > 0 && (
        <div>
          <h3 className="text-lg font-serif font-semibold mb-3">Recent Vitals</h3>
          <div className="space-y-2">
            {logs.slice(-5).reverse().map(log => (
              <Card key={log.id} className="shadow-sm">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {new Date(log.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      {log.weight_lbs && <span>{log.weight_lbs} lbs</span>}
                      {log.systolic_bp && log.diastolic_bp && <span>{log.systolic_bp}/{log.diastolic_bp}</span>}
                      {log.spo2 && <span>SpO2 {log.spo2}%</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FamilyView() {
  const [, setLocation] = useLocation();
  const { user } = useSupabaseAuth();
  const { patient, loading: patientLoading } = usePatient();
  const { isFamilyMember, patientId: familyPatientId, loading: familyLoading } = useFamilyReadAccess();
  const { members, inviteMember } = useFamilyAccess(patient?.id);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const { error } = await inviteMember(inviteEmail.trim());
    if (error) {
      toast.error(error);
    } else {
      toast.success('Family member added');
      setInviteEmail('');
    }
    setInviting(false);
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/signup`;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      toast.success('Sign-up link copied');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  if (patientLoading || familyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Family member read-only view
  if (isFamilyMember && familyPatientId && !patient) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="container max-w-2xl flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xl font-serif font-semibold text-foreground">CareLoop</span>
            </div>
            <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">Family View</span>
          </div>
        </header>
        <div className="flex-1 container max-w-2xl py-6">
          <FamilyReadOnlyDashboard patientId={familyPatientId} />
        </div>
        <DisclaimerFooter />
      </div>
    );
  }

  // Caregiver: manage family access
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
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center">
            <Users className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-semibold">Family Access</h1>
            <p className="text-muted-foreground">Let family members check in on {patient?.name || 'the patient'} remotely</p>
          </div>
        </div>

        {/* How it works */}
        <Card className="shadow-sm mb-6 bg-blue-50/50 border-blue-200">
          <CardContent className="py-5">
            <h3 className="text-base font-semibold mb-3">How Family Access Works</h3>
            <div className="space-y-2 text-sm text-foreground/80">
              <p><strong>Step 1:</strong> Share the sign-up link below with your family member.</p>
              <p><strong>Step 2:</strong> They create an account with their email and password.</p>
              <p><strong>Step 3:</strong> Enter their email below to grant them read-only access.</p>
              <p><strong>Step 4:</strong> They sign in using the "email" option on the login page and see a read-only view of {patient?.name || 'the patient'}'s status.</p>
            </div>
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="mt-4 h-11"
            >
              {linkCopied ? (
                <><CheckCircle2 className="mr-2 w-4 h-4" /> Link Copied</>
              ) : (
                <><Share2 className="mr-2 w-4 h-4" /> Copy Sign-Up Link for Family</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Invite form */}
        <Card className="shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-serif flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Grant Access by Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex gap-3">
              <div className="flex-1">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Family member's email"
                  className="h-12 text-base"
                />
              </div>
              <Button type="submit" className="h-12 px-6" disabled={inviting}>
                {inviting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add'}
              </Button>
            </form>
            <p className="text-sm text-muted-foreground mt-3">
              Enter the same email they used to create their account. They'll be able to see status, vitals, and alerts — but can't edit anything.
            </p>
          </CardContent>
        </Card>

        {/* Current members */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-serif">Authorized Members</CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No family members added yet.
              </p>
            ) : (
              <div className="space-y-3">
                {members.map((member, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {member.invited_email || `User: ${member.user_id?.slice(0, 8)}...`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <DisclaimerFooter />
    </div>
  );
}
