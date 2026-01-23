import * as React from 'react';
import { Input } from './input';
import { masks, MaskType } from '@/lib/masks';
import { cn } from '@/lib/utils';

type InputProps = React.ComponentProps<'input'>;

export interface MaskedInputProps extends Omit<InputProps, 'onChange'> {
  mask: MaskType;
  onChange?: (value: string) => void;
  onValueChange?: (rawValue: string, maskedValue: string) => void;
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, onChange, onValueChange, className, value, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const maskedValue = masks[mask](rawValue);
      
      // Update the input value with the masked version
      e.target.value = maskedValue;
      
      if (onChange) {
        onChange(maskedValue);
      }
      
      if (onValueChange) {
        const unmaskedValue = rawValue.replace(/\D/g, '');
        onValueChange(unmaskedValue, maskedValue);
      }
    };

    // Apply mask to initial/controlled value
    const displayValue = value !== undefined ? masks[mask](String(value)) : undefined;

    return (
      <Input
        ref={ref}
        className={cn(className)}
        value={displayValue}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

MaskedInput.displayName = 'MaskedInput';

export { MaskedInput };
