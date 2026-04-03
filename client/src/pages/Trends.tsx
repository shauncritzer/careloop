import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { usePatient, useDailyLogs } from '@/hooks/useSupabaseData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, TrendingUp } from 'lucide-react';
import DisclaimerFooter from '@/components/DisclaimerFooter';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function Trends() {
  const [, setLocation] = useLocation();
  const { patient, loading: patientLoading } = usePatient();
  const { logs, loading: logsLoading } = useDailyLogs(patient?.id, 7);

  const chartData = useMemo(() => {
    return logs.map(log => ({
      date: new Date(log.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: log.weight_lbs,
      systolic: log.systolic_bp,
      diastolic: log.diastolic_bp,
      pulse: log.pulse_bpm,
      spo2: log.spo2,
      symptoms: [
        log.breathing_worse, log.mild_confusion, log.severe_confusion,
        log.stomach_pain_bent_over, log.swelling, log.poor_sleep,
        log.weak_exhausted, log.poor_appetite, log.cough_worse, log.fall_or_near_fall
      ].filter(Boolean).length,
      medsAdherence: [log.lasix_taken, log.all_meds_taken].filter(Boolean).length,
    }));
  }, [logs]);

  if (patientLoading || logsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 container max-w-3xl py-8">
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 min-h-[48px]"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-base">Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-semibold">7-Day Trends</h1>
            <p className="text-muted-foreground">Health metrics for {patient?.name}</p>
          </div>
        </div>

        {chartData.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground text-lg">No check-in data yet. Complete a daily check-in to see trends.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Weight Chart */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-serif">Weight (lbs)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 13 }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 13 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="weight" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 5 }} name="Weight" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Blood Pressure Chart */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-serif">Blood Pressure</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 13 }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 13 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="systolic" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="Systolic" />
                    <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Diastolic" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pulse & SpO2 Chart */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-serif">Pulse & Oxygen</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 13 }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 13 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="pulse" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Pulse (bpm)" />
                    <Line type="monotone" dataKey="spo2" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="SpO2 (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Symptoms & Meds */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-serif">Symptoms & Medication Adherence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {chartData.map((day, i) => (
                    <div key={i} className="flex items-center gap-4 py-2 border-b border-border last:border-0">
                      <span className="text-sm font-medium w-16 shrink-0">{day.date}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Symptoms:</span>
                        <div className="flex gap-1">
                          {Array.from({ length: 10 }).map((_, j) => (
                            <div
                              key={j}
                              className={`w-3 h-3 rounded-full ${
                                j < day.symptoms ? 'bg-amber-400' : 'bg-muted'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Meds:</span>
                        <div className="flex gap-1">
                          {Array.from({ length: 2 }).map((_, j) => (
                            <div
                              key={j}
                              className={`w-3 h-3 rounded-full ${
                                j < day.medsAdherence ? 'bg-emerald-400' : 'bg-red-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <DisclaimerFooter />
    </div>
  );
}
