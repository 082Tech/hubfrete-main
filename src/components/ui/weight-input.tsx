import * as React from 'react';
import { Input } from './input';
import { weightMask } from '@/lib/masks';
import { cn } from '@/lib/utils';

interface WeightInputProps extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value'> {
  value: number | undefined;
  onValueChange: (value: number) => void;
  unit?: string;
}

const WeightInput = React.forwardRef<HTMLInputElement, WeightInputProps>(
  ({ value, onValueChange, unit = 'kg', className, ...props }, ref) => {
    const [display, setDisplay] = React.useState(() => weightMask.format(value));

    React.useEffect(() => {
      const currentParsed = weightMask.parse(display);
      if (value !== currentParsed) {
        setDisplay(weightMask.format(value));
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const masked = weightMask.apply(raw);
      setDisplay(masked);
      onValueChange(weightMask.parse(masked));
    };

    return (
      <div className="relative">
        <Input
          ref={ref}
          className={cn('pr-10', className)}
          value={display}
          onChange={handleChange}
          inputMode="decimal"
          {...props}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
          {unit}
        </span>
      </div>
    );
  }
);

WeightInput.displayName = 'WeightInput';

export { WeightInput };
