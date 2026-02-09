import { useState } from 'react';
import { format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DateRangePickerProps {
  dateRange: { start: Date; end: Date };
  onDateRangeChange: (range: { start: Date; end: Date }) => void;
  className?: string;
}

export function DateRangePicker({ dateRange, onDateRangeChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const selected: DateRange = {
    from: dateRange.start,
    to: dateRange.end,
  };

  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      onDateRangeChange({
        start: range.from,
        end: range.to || range.from,
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal min-w-[240px]',
            !dateRange && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="w-4 h-4 mr-2" />
          {format(dateRange.start, 'dd/MM/yyyy', { locale: ptBR })} – {format(dateRange.end, 'dd/MM/yyyy', { locale: ptBR })}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          numberOfMonths={2}
          locale={ptBR}
          disabled={(date) => date > new Date()}
          className={cn('p-3 pointer-events-auto')}
        />
      </PopoverContent>
    </Popover>
  );
}

export function getDefaultDateRange(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfMonth(now),
    end: now,
  };
}
