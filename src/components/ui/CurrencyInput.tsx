import { useState, useEffect, useRef, ChangeEvent } from 'react';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  prefix?: string;
  ariaLabel?: string;
}

export const CurrencyInput = ({
  value,
  onChange,
  className = '',
  placeholder = '0',
  disabled = false,
  prefix,
  ariaLabel,
}: CurrencyInputProps) => {
  const [localStr, setLocalStr] = useState<string>(() => (value ? value.toString() : ''));
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      setLocalStr(value === 0 ? '' : value.toString());
    }
  }, [value, isFocused]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    raw = raw.replace(/[^\d.,-]/g, '');
    setLocalStr(raw);

    const normalized = raw.replace(',', '.');
    const num = parseFloat(normalized);
    onChange(isNaN(num) ? 0 : num);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const normalized = localStr.replace(',', '.');
    const num = parseFloat(normalized);
    const cleanNum = isNaN(num) ? 0 : num;
    onChange(cleanNum);
    setLocalStr(cleanNum === 0 ? '' : cleanNum.toString());
  };

  const handleFocus = () => {
    setIsFocused(true);
    setTimeout(() => inputRef.current?.select(), 10);
  };

  return (
    <div
      className={`inline-flex items-center w-full rounded border transition-colors ${
        isFocused
          ? 'border-[#0e6b7a] ring-1 ring-[#0e6b7a] bg-white dark:bg-slate-900'
          : 'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      {prefix && (
        <span className="pl-1.5 text-[11px] font-medium text-slate-400 select-none">
          {prefix}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        disabled={disabled}
        aria-label={ariaLabel}
        value={localStr}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="w-full bg-transparent text-right font-mono text-xs py-1 px-1.5 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed tabular-nums"
      />
    </div>
  );
};
