import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { usePatient, useDailyLogs } from '@/hooks/useSupabaseData';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Send, Loader2, MessageCircle, Heart, AlertTriangle } from 'lucide-react';
import DisclaimerFooter from '@/components/DisclaimerFooter';
import { Streamdown } from 'streamdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "His weight went up 2 pounds today, should I be worried?",
  "What are the warning signs I should watch for with CHF?",
  "How much fluid should he be drinking per day?",
  "He seems more confused today. What should I do?",
  "What foods should he avoid for sodium?",
  "When should I call the doctor vs go to the ER?",
];

export default function AskAssistant() {
  const [, setLocation] = useLocation();
  const { patient } = usePatient();
  const { logs } = useDailyLogs(patient?.id, 7);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const askMutation = trpc.careloop.askAssistant.useMutation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build context from recent logs
      const recentData = logs.slice(-3).map(l => ({
        date: l.log_date,
        weight: l.weight_lbs,
        bp: l.systolic_bp && l.diastolic_bp ? `${l.systolic_bp}/${l.diastolic_bp}` : null,
        pulse: l.pulse_bpm,
        spo2: l.spo2,
        fluid_oz: l.fluid_intake_oz,
        sodium_mg: l.sodium_mg,
        symptoms: [
          l.breathing_worse && 'breathing worse',
          l.swelling && 'swelling',
          l.confusion && 'confusion',
          l.dizziness && 'dizziness',
          l.chest_pain && 'chest pain',
          l.missed_meds && 'missed meds',
          l.poor_appetite && 'poor appetite',
          l.poor_sleep && 'poor sleep',
        ].filter(Boolean).join(', ') || 'none',
      }));

      const result = await askMutation.mutateAsync({
        question: text.trim(),
        patientName: patient?.name || 'the patient',
        recentData: JSON.stringify(recentData),
        conversationHistory: messages.slice(-6).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      setMessages(prev => [...prev, { role: 'assistant', content: result }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I\'m sorry, I wasn\'t able to process that question right now. Please try again in a moment.',
      }]);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-2xl flex items-center gap-3 py-4">
          <button
            onClick={() => setLocation('/')}
            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-serif font-semibold">Care Assistant</h1>
            <p className="text-xs text-muted-foreground">Ask questions about care and symptoms</p>
          </div>
        </div>
      </header>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="container max-w-2xl py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="space-y-6">
              {/* Welcome */}
              <div className="text-center space-y-3 py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-serif font-semibold">How can I help?</h2>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Ask me anything about caring for {patient?.name || 'your loved one'}.
                  I can help interpret readings, explain symptoms, and suggest when to call the doctor.
                </p>
              </div>

              {/* Disclaimer */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  I provide general guidance only — not medical advice. Always confirm important decisions with your doctor or care team.
                </p>
              </div>

              {/* Suggested questions */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">Common questions:</p>
                <div className="grid gap-2">
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="text-left p-3 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-sm"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border shadow-sm'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none text-foreground">
                      <Streamdown>{msg.content}</Streamdown>
                    </div>
                  ) : (
                    <p className="text-base">{msg.content}</p>
                  )}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-card/80 backdrop-blur-sm">
        <div className="container max-w-2xl py-4">
          <div className="flex gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Ask a question..."
              className="min-h-[48px] max-h-[120px] text-base resize-none"
              rows={1}
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="h-12 w-12 shrink-0"
              size="icon"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
      <DisclaimerFooter />
    </div>
  );
}
