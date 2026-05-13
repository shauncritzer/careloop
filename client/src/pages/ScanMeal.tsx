import { useLocation } from 'wouter';
import { ArrowLeft, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MealScanner from '@/components/MealScanner';
import DisclaimerFooter from '@/components/DisclaimerFooter';
import { toast } from 'sonner';

export default function ScanMeal() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-2xl flex items-center gap-3 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/')}
            className="w-10 h-10 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-serif font-semibold text-foreground">Scan a Meal</span>
          </div>
        </div>
      </header>

      <div className="flex-1 container max-w-2xl py-6">
        <p className="text-muted-foreground text-base mb-6">
          Take or upload a photo of any meal to get an AI estimate of its sodium content.
          Results are estimates — always check nutrition labels when available.
        </p>

        <MealScanner
          onSodiumLogged={(mg) => {
            toast.success(`Logged ${mg}mg sodium from this meal.`, {
              description: 'Remember to add this to your daily check-in.',
              duration: 5000,
            });
          }}
          dailySodiumSoFar={0}
          sodiumLimitMg={undefined}
          onClose={() => setLocation('/')}
        />
      </div>

      <DisclaimerFooter />
    </div>
  );
}
