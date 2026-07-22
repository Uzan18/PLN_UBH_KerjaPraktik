'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Option {
  value: string;
  label: string;
}

interface FilterSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  placeholder: string;
  className?: string;
  buttonClassName?: string;
  variant?: 'outline' | 'inline';
  disabled?: boolean;
  showPlaceholderOption?: boolean;
}

export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  className = '',
  buttonClassName = '',
  variant = 'outline',
  disabled = false,
  showPlaceholderOption = true,
}: FilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle typing to filter options
  useEffect(() => {
    if (!isOpen || disabled) {
      setSearchQuery('');
      return;
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Ignore modifier keys or shortcuts
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Handle special keys
      if (e.key === 'Escape') {
        setIsOpen(false);
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        setSearchQuery((prev) => prev.slice(0, -1));
        return;
      }

      if (e.key === 'Enter') {
        // If there's filtered options, select the first one
        if (filteredOptions.length > 0) {
          onChange(filteredOptions[0].value);
        }
        setIsOpen(false);
        return;
      }

      // Handle single character keys (alphanumeric, spaces, punctuation)
      if (e.key.length === 1) {
        e.preventDefault();
        setSearchQuery((prev) => prev + e.key);

        // Auto-clear query after 3 seconds of inactivity
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
          setSearchQuery('');
        }, 3000);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [isOpen, searchQuery, options, disabled]);

  const selectedOption = options.find((opt) => opt.value === value);

  // Filter options based on typed query (case-insensitive)
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const buttonClass = variant === 'inline'
    ? `bg-transparent border-none font-mono text-xs font-bold focus:ring-0 p-0 cursor-pointer text-on-surface inline-flex items-center gap-1 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${buttonClassName}`
    : `w-full bg-white border border-surface-border rounded-lg text-xs py-1.5 px-3 flex items-center justify-between shadow-sm cursor-pointer hover:bg-surface-container-low transition-all text-left min-h-[32px] focus:ring-1 focus:ring-primary focus:outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${buttonClassName}`;

  return (
    <div ref={containerRef} className={`relative ${variant === 'inline' ? 'inline-block' : ''} ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClass}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <span className="material-symbols-outlined text-sm text-outline select-none ml-0.5">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {/* Dropdown List */}
      {isOpen && (
        <div className={`absolute z-50 bg-white border border-surface-border rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto text-xs py-1 flex flex-col ${variant === 'inline' ? 'left-0 w-52' : 'left-0 right-0 w-full'}`}>
          {/* Query Indicator (if user typed something) */}
          {searchQuery && (
            <div className="px-3 py-1.5 bg-surface-container-low border-b border-surface-border flex items-center justify-between text-[10px] text-on-surface-variant font-mono font-medium shrink-0">
              <span className="truncate">Menyaring: "{searchQuery}"</span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-primary hover:underline font-bold cursor-pointer ml-1"
              >
                Clear
              </button>
            </div>
          )}

          {/* Options container */}
          <div className="overflow-y-auto max-h-48 custom-scrollbar">
            {/* Default/Placeholder Option */}
            {showPlaceholderOption && searchQuery === '' && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 hover:bg-primary-container/20 transition-all font-semibold ${
                  value === '' ? 'text-primary bg-primary-container/10' : 'text-on-surface-variant'
                }`}
              >
                {placeholder}
              </button>
            )}

            {filteredOptions.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 hover:bg-primary-container/20 transition-all ${
                  opt.value === value
                    ? 'text-primary font-bold bg-primary-container/10'
                    : 'text-on-surface'
                }`}
              >
                {opt.label}
              </button>
            ))}

            {filteredOptions.length === 0 && (
              <div className="px-3 py-3 text-center text-outline italic text-[11px]">
                Tidak ada opsi yang cocok
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
