'use client';

import type { JudgementLabel, DataStatus } from '@/types';
import { STATUS_COLORS, DATA_STATUS_COLORS } from '@/types';

/**
 * StatusBadge — unified status badge component for SIAT.
 * 
 * CONVENTION (CLAUDE.md): All status color display MUST go through this component.
 * Do NOT hardcode hex colors elsewhere.
 * 
 * Colors:
 * - Good: #22C55E
 * - Fair: #EAB308
 * - Poor: #F97316
 * - Bad:  #EF4444
 */

interface StatusBadgeProps {
  judgement?: JudgementLabel;
  status?: DataStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  iconOnly?: boolean;
  className?: string;
}

const JUDGEMENT_ICONS: Record<JudgementLabel, string> = {
  GOOD: 'check_circle',
  FAIR: 'info',
  POOR: 'warning',
  BAD: 'cancel',
  NA: 'radio_button_unchecked',
};

const DATA_STATUS_ICONS: Record<DataStatus, string> = {
  DRAFT: 'edit_note',
  SUBMITTED: 'schedule',
  VALIDATED: 'verified',
  REJECTED: 'cancel',
};

const DATA_STATUS_LABELS: Record<DataStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Menunggu Validasi',
  VALIDATED: 'Tervalidasi',
  REJECTED: 'Ditolak',
};

const SIZE_CLASSES = {
  sm: 'px-1.5 py-0.5 text-[10px] gap-0.5',
  md: 'px-2 py-1 text-[11px] gap-1',
  lg: 'px-3 py-1.5 text-[13px] gap-1.5',
};

const ICON_SIZES = {
  sm: 'text-[12px]',
  md: 'text-[14px]',
  lg: 'text-[18px]',
};

export function StatusBadge({
  judgement,
  status,
  size = 'md',
  showIcon = true,
  iconOnly = false,
  className = '',
}: StatusBadgeProps) {
  if (judgement) {
    const color = STATUS_COLORS[judgement];
    const icon = JUDGEMENT_ICONS[judgement];
    
    const shapeClass = iconOnly 
      ? 'w-5 h-5 justify-center rounded-full p-0' 
      : `${SIZE_CLASSES[size]} rounded-full`;
    
    return (
      <span
        className={`inline-flex items-center ${shapeClass} font-bold ${className}`}
        style={{
          backgroundColor: `${color}15`,
          color: color,
          border: `1px solid ${color}30`,
        }}
        title={judgement}
      >
        {showIcon && (
          <span
            className={`material-symbols-outlined ${ICON_SIZES[size]}`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        )}
        {!iconOnly && judgement}
      </span>
    );
  }

  if (status) {
    const color = DATA_STATUS_COLORS[status];
    const icon = DATA_STATUS_ICONS[status];
    const label = DATA_STATUS_LABELS[status];

    return (
      <span
        className={`inline-flex items-center ${SIZE_CLASSES[size]} font-bold rounded-full ${className}`}
        style={{
          backgroundColor: `${color}15`,
          color: color,
          border: `1px solid ${color}30`,
        }}
      >
        {showIcon && status === 'SUBMITTED' && (
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: color }}
          />
        )}
        {showIcon && status !== 'SUBMITTED' && (
          <span
            className={`material-symbols-outlined ${ICON_SIZES[size]}`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        )}
        {label}
      </span>
    );
  }

  return null;
}
