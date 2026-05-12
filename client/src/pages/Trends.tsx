import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { usePatient, useDailyLogs } from '@/hooks/useCareData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, TrendingUp } from 'lucide-react';
import DisclaimerFooter from '@/components/DisclaimerFooter';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';

export default function Trends() {
  const [, setLocation] = useLocation();
  const { patient, loading: patientLoading } = usePatient();
  const { logs, loading: logsLoading } = useDailyLogs(patient?.id, 14);

  const chartData = useMemo(() => {
    return logs.map(log => ({
      date: new Date(log.logDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: log.weightLbs,
      systolic: log.systolicBp,
      diastolic: log.diastolicBp,
      pulse: log.pulseBpm,
      spo2: log.spo2,
      fluid: log.fluidIntakeOz,
      sodium: log.sodiumMg,
      symptoms: [
        log.breathingWorse, log.swelling, log.confusion, log.dizziness,
        log.chestPain, log.fallOrNearFall, log.poorAppetite, log.poorSleep
      ].filter(Boolean).length,
      medsTaken: !log.missedMeds,
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
            <h1 className="text-2xl font-serif font-semibold">Health Trends</h1>
            <p className="text-muted-foreground">Tracking metrics for {patient?.name}</p>
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
            {/* Weight Chart — most important */}
            <Card className="shadow-sm border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg font-serif">Weight (lbs)</CardTitle>
                <p className="text-sm text-muted-foreground">The most important CHF metric — watch for sudden increases</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    {patient?.baselineWeightLbs && (
                      <ReferenceLine y={patient.baselineWeightLbs} stroke="#94a3b8" strokeDasharray="5 5" label={{ value: 'Baseline', fontSize: 11, fill: '#94a3b8' }} />
                    )}
                    <Line type="monotone" dataKey="weight" stroke="#0d9488" strokeWidth={3} dot={{ r: 5, fill: '#0d9488' }} name="Weight" connectNulls />
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
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="systolic" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="Systolic" connectNulls />
                    <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Diastolic" connectNulls />
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
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="pulse" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Pulse (bpm)" connectNulls />
                    <Line type="monotone" dataKey="spo2" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="SpO2 (%)" connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Fluid Intake Chart */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-serif">Fluid Intake (oz)</CardTitle>
                {patient?.fluidLimitOz && (
                  <p className="text-sm text-muted-foreground">Daily limit: {patient.fluidLimitOz} oz</p>
                )}
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    {patient?.fluidLimitOz && (
                      <ReferenceLine y={patient.fluidLimitOz} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Limit', fontSize: 11, fill: '#ef4444' }} />
                    )}
                    <Bar dataKey="fluid" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Fluid (oz)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Sodium Intake Chart */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-serif">Sodium Intake (mg)</CardTitle>
                {patient?.sodiumLimitMg && (
                  <p className="text-sm text-muted-foreground">Daily limit: {patient.sodiumLimitMg} mg</p>
                )}
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    {patient?.sodiumLimitMg && (
                      <ReferenceLine y={patient.sodiumLimitMg} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Limit', fontSize: 11, fill: '#ef4444' }} />
                    )}
                    <Bar dataKey="sodium" fill="#f97316" radius={[4, 4, 0, 0]} name="Sodium (mg)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Symptoms & Meds Summary */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-serif">Daily Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {chartData.map((day, i) => (
                    <div key={i} className="flex items-center gap-4 py-2 border-b border-border last:border-0">
                      <span className="text-sm font-medium w-16 shrink-0">{day.date}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Symptoms:</span>
                        <div className="flex gap-1">
                          {Array.from({ length: 8 }).map((_, j) => (
                            <div
                              key={j}
                              className={`w-3 h-3 rounded-full ${j < day.symptoms ? 'bg-amber-400' : 'bg-muted'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        day.medsTaken ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {day.medsTaken ? 'Meds taken' : 'Meds missed'}
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
