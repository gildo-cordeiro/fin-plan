import * as React from "react";
import { NumericFormat, NumericFormatProps } from "react-number-format";
import { cn } from "../../lib/cn";

export interface MoneyInputProps extends Omit<NumericFormatProps, "value" | "onChange"> {
  value?: number;
  onChange?: (value: number) => void;
  className?: string;
  prefix?: string;
  ariaLabel?: string;
  debounceMs?: number;
}

const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ className, value, onChange, prefix = "R$ ", ariaLabel, debounceMs: _debounceMs, ...props }, ref) => {
    // debounceMs is ignored because NumericFormat handles typing naturally.
    return (
      <NumericFormat
        getInputRef={ref}
        value={value}
        onValueChange={(values) => {
          if (onChange) {
            onChange(values.floatValue || 0);
          }
        }}
        thousandSeparator="."
        decimalSeparator=","
        prefix={prefix}
        decimalScale={2}
        fixedDecimalScale
        allowNegative={false}
        aria-label={ariaLabel}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 tabular-nums",
          className
        )}
        {...props}
      />
    );
  }
);
MoneyInput.displayName = "MoneyInput";

export { MoneyInput };
