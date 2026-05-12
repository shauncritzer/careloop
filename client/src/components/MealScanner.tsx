import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, AlertTriangle, CheckCircle, Loader2, ChefHat, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface MealScannerProps {
  onSodiumLogged: (sodiumMg: number) => void;
  dailySodiumSoFar?: number;
  sodiumLimitMg?: number;
  onClose?: () => void;
}

type AnalysisResult = {
  success: true;
  foods: Array<{ name: string; portion: string; sodiumMg: number }>;
  totalSodiumMg: number;
  confidence: string;
  notes: string;
  highSodiumWarning: boolean;
} | {
  success: false;
  error: string;
};

export default function MealScanner({ onSodiumLogged, dailySodiumSoFar = 0, sodiumLimitMg, onClose }: MealScannerProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const analyzeMeal = trpc.careloop.analyzeMeal.useMutation();

  const processImage = useCallback((file: File) => {
    const mime = file.type || 'image/jpeg';
    setImageMime(mime);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      // Strip the data:image/...;base64, prefix
      const base64 = dataUrl.split(',')[1];
      setImageBase64(base64 || null);
      setResult(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const handleAnalyze = async () => {
    if (!imageBase64) return;
    setIsAnalyzing(true);
    try {
      const res = await analyzeMeal.mutateAsync({
        imageBase64,
        mimeType: imageMime,
        patientSodiumLimitMg: sodiumLimitMg,
      });
      setResult(res);
    } catch (err) {
      toast.error('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLogSodium = () => {
    if (result?.success) {
      onSodiumLogged(result.totalSodiumMg);
      toast.success(`Logged ${result.totalSodiumMg}mg sodium from this meal`);
      if (onClose) onClose();
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setImageBase64(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const remainingSodium = sodiumLimitMg ? sodiumLimitMg - dailySodiumSoFar : null;
  const mealExceedsRemaining = result?.success && remainingSodium !== null && result.totalSodiumMg > remainingSodium;

  const confidenceColor = (c: string) => {
    if (c === 'high') return 'text-emerald-600';
    if (c === 'medium') return 'text-amber-600';
    return 'text-red-500';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-slate-800">Scan Meal for Sodium</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Daily sodium context */}
      {sodiumLimitMg && (
        <div className={`rounded-xl p-3 text-sm font-medium ${
          remainingSodium !== null && remainingSodium < 500
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-teal-50 text-teal-700 border border-teal-200'
        }`}>
          <div className="flex items-center justify-between">
            <span>Today's sodium so far: <strong>{dailySodiumSoFar}mg</strong></span>
            <span>Limit: <strong>{sodiumLimitMg}mg</strong></span>
          </div>
          {remainingSodium !== null && (
            <div className="mt-1">
              Remaining budget: <strong>{Math.max(0, remainingSodium)}mg</strong>
              {remainingSodium <= 0 && ' — limit reached for today'}
            </div>
          )}
        </div>
      )}

      {/* Image area */}
      {!imagePreview ? (
        <div className="space-y-3">
          <div
            className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Take or upload a photo of the meal</p>
            <p className="text-slate-400 text-sm mt-1">AI will estimate the sodium content</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Camera capture (mobile) */}
            <Button
              variant="outline"
              className="h-12 gap-2 border-teal-200 text-teal-700 hover:bg-teal-50"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="w-4 h-4" />
              Take Photo
            </Button>
            {/* File upload */}
            <Button
              variant="outline"
              className="h-12 gap-2 border-slate-200 text-slate-600 hover:bg-slate-50"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" />
              Upload Photo
            </Button>
          </div>

          {/* Hidden inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Preview */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-100">
            <img
              src={imagePreview}
              alt="Meal to analyze"
              className="w-full max-h-64 object-cover"
            />
            <button
              onClick={handleReset}
              className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 shadow-sm hover:bg-white transition-colors"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {/* Analyze button */}
          {!result && (
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing meal...
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4" />
                  Analyze Sodium Content
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {result.success ? (
            <>
              {/* Warning banner */}
              {(result.highSodiumWarning || mealExceedsRemaining) && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="text-sm text-red-700">
                    {mealExceedsRemaining
                      ? `This meal (${result.totalSodiumMg}mg) exceeds today's remaining sodium budget (${Math.max(0, remainingSodium ?? 0)}mg).`
                      : 'This meal is high in sodium. Consider a smaller portion or lower-sodium alternative.'}
                  </div>
                </div>
              )}

              {/* Total */}
              <Card className="p-4 bg-gradient-to-br from-teal-50 to-white border-teal-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Estimated Sodium</p>
                    <p className="text-3xl font-bold text-teal-700">{result.totalSodiumMg}<span className="text-base font-normal text-slate-500 ml-1">mg</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 mb-1">Confidence</p>
                    <Badge variant="outline" className={`capitalize font-semibold ${confidenceColor(result.confidence)}`}>
                      {result.confidence}
                    </Badge>
                  </div>
                </div>
              </Card>

              {/* Food breakdown */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Food Breakdown</p>
                {result.foods.map((food, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{food.name}</p>
                      <p className="text-xs text-slate-400">{food.portion}</p>
                    </div>
                    <span className={`text-sm font-semibold ${food.sodiumMg > 400 ? 'text-red-600' : food.sodiumMg > 200 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {food.sodiumMg}mg
                    </span>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {result.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">
                  <strong>Note:</strong> {result.notes}
                </div>
              )}

              {/* Disclaimer */}
              <p className="text-xs text-slate-400 text-center">
                Estimates only. Actual sodium may vary. Always verify with nutrition labels when available.
              </p>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-11 border-slate-200 text-slate-600"
                  onClick={handleReset}
                >
                  Scan Another
                </Button>
                <Button
                  className="h-11 bg-teal-600 hover:bg-teal-700 text-white font-semibold gap-2"
                  onClick={handleLogSodium}
                >
                  <CheckCircle className="w-4 h-4" />
                  Log {result.totalSodiumMg}mg
                </Button>
              </div>
            </>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-700 font-medium">Analysis failed</p>
              <p className="text-red-500 text-sm mt-1">{result.error}</p>
              <Button variant="outline" className="mt-3" onClick={handleReset}>Try Again</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
