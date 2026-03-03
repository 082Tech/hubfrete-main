import * as React from 'react';
import { Input } from './input';
import { currencyMask } from '@/lib/masks';
import { cn } from '@/lib/utils';

interface CurrencyInputProps extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value'> {
  value: number | undefined;
  onValueChange: (value: number) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, className, ...props }, ref) => {
    const [display, setDisplay] = React.useState(() => currencyMask.format(value));

    // Sync display when external value changes (e.g. form reset)
    React.useEffect(() => {
      const currentParsed = currencyMask.parse(display);
      if (value !== currentParsed) {
        setDisplay(currencyMask.format(value));
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const masked = currencyMask.apply(raw);
      setDisplay(masked);
      onValueChange(currencyMask.parse(masked));
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
          R$
        </span>
        <Input
          ref={ref}
          className={cn('pl-9', className)}
          value={display}
          onChange={handleChange}
          inputMode="numeric"
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };
