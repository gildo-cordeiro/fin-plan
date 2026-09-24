import { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from 'react';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  prefix?: string;
  ariaLabel?: string;
  debounceMs?: number;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
}

export const CurrencyInput = ({
  value,
  onChange,
  className = '',
  placeholder = '0',
  disabled = false,
  prefix,
  ariaLabel,
  debounceMs = 350,
  onKeyDown,
}: CurrencyInputProps) => {
  const [localStr, setLocalStr] = useState<string>(() => (value ? value.toString() : ''));
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevValueRef = useRef(value);

  // Sincroniza estado local quando o valor externo muda
  // Se não estiver em foco OU se o valor externo foi resetado para 0, atualiza o texto local
  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      if (!isFocused || value === 0) {
        setLocalStr(value === 0 ? '' : value.toString());
      }
    }
  }, [value, isFocused]);

  // Limpa timer se o componente desmontar
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const commitValue = (rawString: string) => {
    const normalized = rawString.replace(',', '.');
    const num = parseFloat(normalized);
    const cleanNum = isNaN(num) ? 0 : num;
    prevValueRef.current = cleanNum;
    onChange(cleanNum);
    return cleanNum;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    raw = raw.replace(/[^\d.,-]/g, '');
    setLocalStr(raw);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (debounceMs === 0) {
      commitValue(raw);
    } else {
      debounceTimerRef.current = setTimeout(() => {
        commitValue(raw);
      }, debounceMs);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    const cleanNum = commitValue(localStr);
    setLocalStr(cleanNum === 0 ? '' : cleanNum.toString());
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      commitValue(localStr);
      if (!onKeyDown) {
        e.currentTarget.blur();
      }
    }
    onKeyDown?.(e);
  };

  const handleFocus = () => {
    setIsFocused(true);
    setTimeout(() => inputRef.current?.select(), 10);
  };

  return (
    <div
      className={`inline-flex items-center w-full rounded-lg border transition-all duration-150 ${
        isFocused
          ? 'border-[#0e6b7a] ring-2 ring-[#0e6b7a]/20 bg-white dark:bg-slate-900 shadow-xs'
          : 'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      {prefix && (
        <span className="pl-2 text-[11px] font-semibold text-slate-400 select-none">
          {prefix}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        disabled={disabled}
        aria-label={ariaLabel || 'Valor monetário'}
        value={localStr}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent text-right font-mono text-xs py-1.5 px-2 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed tabular-nums"
      />
    </div>
  );
};
