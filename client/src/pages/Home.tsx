import { useLocation } from 'wouter';
import { usePatient, useDailyLogs, useAlerts } from '@/hooks/useCareData';
import { getSeverityLabel, getSeverityColor } from '@/lib/alertEngine';
import type { Severity } from '@/lib/alertEngine';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Heart, ClipboardCheck, TrendingUp, FileText, Users, Loader2,
  AlertTriangle, CheckCircle2, XCircle, Calendar, ChevronRight, Settings,
  MessageCircle, Camera
} from 'lucide-react';
import DisclaimerFooter from '@/components/DisclaimerFooter';

export default function Home() {
  const [, setLocation] = useLocation();
  const { patient, loading: patientLoading } = usePatient();
  const { logs } = useDailyLogs(patient?.id, 7);
  const { alerts } = useAlerts(patient?.id, 5);

  if (patientLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-lg">Loading CareLoop...</p>
        </div>
      </div>
    );
  }

  // First-time setup — no patient profile yet
  if (!patient) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center px-4">
          <Card className="max-w-md w-full shadow-lg">
            <CardContent className="pt-10 pb-10 text-center space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10">
                <Heart className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-3xl font-serif font-semibold">Welcome to CareLoop</h1>
              <p className="text-muted-foreground text-lg max-w-sm mx-auto">
                Let's set up your patient's profile to get started with daily monitoring.
              </p>
              <Button
                onClick={() => setLocation('/patient-profile')}
                className="h-14 text-lg font-semibold px-8"
              >
                Set Up Patient Profile
              </Button>
            </CardContent>
          </Card>
        </div>
        <DisclaimerFooter />
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const todayLog = logs.find(l => l.logDate === new Date().toISOString().split('T')[0]);
  const latestAlert = alerts[0];
  const currentSeverity: Severity = (latestAlert?.severity as Severity) || 'green';
  const colors = getSeverityColor(currentSeverity);

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
          <Button variant="ghost" size="icon" onClick={() => setLocation('/patient-profile')} className="w-10 h-10" title="Patient Profile">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 container max-w-2xl py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-foreground">{patient.name}</h1>
          <p className="text-muted-foreground text-base flex items-center gap-2 mt-1">
            <Calendar className="w-4 h-4" />
            {today}
          </p>
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
                  {latestAlert ? `Last check-in: ${new Date(latestAlert.createdAt).toLocaleDateString()}` : 'No check-ins yet'}
                </p>
              </div>
            </div>
            {latestAlert && latestAlert.severity !== 'green' && (
              <div className={`mt-4 pt-4 border-t ${
                currentSeverity === 'red' ? 'border-red-200' : 'border-amber-200'
              }`}>
                <p className={`text-sm ${colors.text}`}>
                  {latestAlert.message.split(' | ')[0]}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Primary CTA */}
        <Button
          onClick={() => setLocation('/check-in')}
          className="w-full h-16 text-lg font-semibold shadow-md"
          size="lg"
        >
          <ClipboardCheck className="mr-3 w-6 h-6" />
          {todayLog ? "Update Today's Check-in" : "Start Today's Check-in"}
        </Button>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-3">
          {/* Scan Meal — prominent standalone feature */}
          <button onClick={() => setLocation('/scan')} className="flex items-center gap-4 p-4 rounded-xl border-2 border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors min-h-[64px]">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
              <Camera className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-semibold text-foreground">Scan a Meal</p>
              <p className="text-sm text-muted-foreground">AI estimates sodium from a photo</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          <button onClick={() => setLocation('/ask')} className="flex items-center gap-4 p-4 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors min-h-[64px]">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-semibold text-foreground">Ask a Question</p>
              <p className="text-sm text-muted-foreground">Get guidance about care and symptoms</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          <button onClick={() => setLocation('/trends')} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors min-h-[64px]">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-semibold text-foreground">Health Trends</p>
              <p className="text-sm text-muted-foreground">View metrics and patterns over time</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          <button onClick={() => setLocation('/doctor-summary')} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors min-h-[64px]">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-semibold text-foreground">Doctor Summary</p>
              <p className="text-sm text-muted-foreground">Generate a shareable report</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          <button onClick={() => setLocation('/family')} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors min-h-[64px]">
            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-teal-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-semibold text-foreground">Family Access</p>
              <p className="text-sm text-muted-foreground">Share read-only access with family</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Recent Alerts */}
        {alerts.length > 0 && (
          <div>
            <h3 className="text-lg font-serif font-semibold mb-3">Recent Alerts</h3>
            <div className="space-y-2">
              {alerts.slice(0, 3).map(alert => {
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
                          {new Date(alert.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <DisclaimerFooter />
    </div>
  );
}
