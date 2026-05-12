import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { usePatient, useDailyLogs, useAlerts, useFamilyAccess } from '@/hooks/useCareData';
import { getSeverityLabel, getSeverityColor } from '@/lib/alertEngine';
import type { Severity } from '@/lib/alertEngine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Loader2, Users, UserPlus, AlertTriangle, CheckCircle2, XCircle,
  Heart, Calendar, Mail, Share2
} from 'lucide-react';
import DisclaimerFooter from '@/components/DisclaimerFooter';
import { toast } from 'sonner';

export default function FamilyView() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { patient, loading: patientLoading } = usePatient();
  const { logs } = useDailyLogs(patient?.id, 7);
  const { alerts } = useAlerts(patient?.id, 10);
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
    const link = `${window.location.origin}/family`;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      toast.success('Family access link copied');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  if (patientLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }

  const latestAlert = alerts[0];
  const currentSeverity: Severity = (latestAlert?.severity as Severity) || 'green';
  const colors = getSeverityColor(currentSeverity);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

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

        {/* Family Read-Only Preview */}
        <Card className={`shadow-lg border-2 ${colors.border} ${colors.bg} mb-6`}>
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
                  {latestAlert ? `Last check-in: ${new Date(latestAlert.createdAt).toLocaleDateString()}` : 'No check-ins yet'}
                </p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {today}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Vitals Preview */}
        {logs.length > 0 && (
          <Card className="shadow-sm mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Recent Vitals (what family sees)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {logs.slice(-5).reverse().map(log => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-xl border border-border">
                    <span className="text-sm font-medium">
                      {new Date(log.logDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      {log.weightLbs && <span>{log.weightLbs} lbs</span>}
                      {log.systolicBp && log.diastolicBp && <span>{log.systolicBp}/{log.diastolicBp}</span>}
                      {log.spo2 && <span>SpO2 {log.spo2}%</span>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* How it works */}
        <Card className="shadow-sm mb-6 bg-blue-50/50 border-blue-200">
          <CardContent className="py-5">
            <h3 className="text-base font-semibold mb-3">How Family Access Works</h3>
            <div className="space-y-2 text-sm text-foreground/80">
              <p><strong>Step 1:</strong> Share the family access link below with your family member.</p>
              <p><strong>Step 2:</strong> They can view {patient?.name || 'the patient'}'s status, vitals, and alerts.</p>
              <p><strong>Step 3:</strong> They cannot edit anything — read-only access.</p>
            </div>
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="mt-4 h-11"
            >
              {linkCopied ? (
                <><CheckCircle2 className="mr-2 w-4 h-4" /> Link Copied</>
              ) : (
                <><Share2 className="mr-2 w-4 h-4" /> Copy Family Access Link</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Invite form */}
        <Card className="shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-serif flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add Family Member by Email
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
              They'll receive a unique access code to view the patient's status.
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
                        {member.invitedEmail}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(member.createdAt).toLocaleDateString()}
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
