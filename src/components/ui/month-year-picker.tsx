import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface MonthYearPickerProps {
  month: number; // 0-indexed
  year: number;
  onChangeMonth: (month: number) => void;
  onChangeYear: (year: number) => void;
}

export function MonthYearPicker({ month, year, onChangeMonth, onChangeYear }: MonthYearPickerProps) {
  const now = new Date();
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();

  const goPrev = () => {
    if (month === 0) {
      onChangeMonth(11);
      onChangeYear(year - 1);
    } else {
      onChangeMonth(month - 1);
    }
  };

  const goNext = () => {
    if (month === 11) {
      onChangeMonth(0);
      onChangeYear(year + 1);
    } else {
      onChangeMonth(month + 1);
    }
  };

  const goToday = () => {
    onChangeMonth(now.getMonth());
    onChangeYear(now.getFullYear());
  };

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" className="h-9 w-9" onClick={goPrev}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <div className="px-3 h-9 flex items-center gap-2 rounded-md border border-input bg-background text-sm font-medium min-w-[180px] justify-center select-none">
        <CalendarDays className="w-4 h-4 text-muted-foreground" />
        {MONTH_NAMES[month]} {year}
      </div>
      <Button variant="outline" size="icon" className="h-9 w-9" onClick={goNext}>
        <ChevronRight className="w-4 h-4" />
      </Button>
      {!isCurrentMonth && (
        <Button variant="ghost" size="sm" className="text-xs text-primary h-9" onClick={goToday}>
          Mês atual
        </Button>
      )}
    </div>
  );
}
