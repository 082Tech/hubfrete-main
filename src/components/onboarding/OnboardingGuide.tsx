import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, ArrowRight, Rocket, PartyPopper } from 'lucide-react';
import { useOnboardingChecklist } from '@/hooks/useOnboardingChecklist';

export function OnboardingGuide() {
  const navigate = useNavigate();
  const { steps, completedCount, totalCount, progress, isComplete } = useOnboardingChecklist();

  if (totalCount === 0) return null;

  if (isComplete) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-green-500/10">
              <PartyPopper className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Implantação concluída!</p>
              <p className="text-sm text-muted-foreground">
                Todas as configurações essenciais foram realizadas. Sua empresa está pronta para operar.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Rocket className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground">Guia de Implantação</p>
              <Badge variant="outline" className="text-xs">
                {completedCount}/{totalCount}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure os itens essenciais para começar a operar na plataforma.
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progresso</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" indicatorClassName="bg-primary" />
        </div>

        {/* Steps */}
        <div className="space-y-1">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => navigate(step.href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors group ${
                step.completed
                  ? 'bg-green-500/5 hover:bg-green-500/10'
                  : 'hover:bg-muted/50'
              }`}
            >
              {step.completed ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${step.completed ? 'text-green-700 dark:text-green-400 line-through' : 'text-foreground'}`}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">{step.description}</p>
              </div>
              {!step.completed && (
                <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
