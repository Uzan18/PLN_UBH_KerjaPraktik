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
  placement?: 'bottom' | 'top';
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
  placement = 'bottom',
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
        <div className={`absolute z-50 bg-white border border-surface-border rounded-lg shadow-xl ${placement === 'top' ? 'bottom-full mb-1' : 'mt-1'} max-h-60 text-xs py-1 flex flex-col ${variant === 'inline' ? 'left-0 w-56' : 'left-0 right-0 w-full min-w-[200px]'}`}>
          {/* Search input field */}
          <div className="p-1.5 border-b border-surface-border sticky top-0 bg-white z-10" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-low border border-surface-border rounded-md text-xs py-1 px-7 pr-6 focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none"
                autoFocus
              />
              <span className="material-symbols-outlined text-outline absolute left-2 top-1/2 -translate-y-1/2 text-xs select-none">
                search
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs select-none">close</span>
                </button>
              )}
            </div>
          </div>

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
