'use client';

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: string;
  variant?: 'default' | 'good' | 'fair' | 'poor' | 'bad' | 'primary';
  subtitle?: string;
}

const VARIANT_STYLES = {
  default: {
    borderClass: '',
    valueColor: 'text-[#111c2d]',
    iconBg: 'bg-[#e7eeff]',
    iconColor: 'text-[#434652]',
  },
  primary: {
    borderClass: '',
    valueColor: 'text-[#00286a]',
    iconBg: 'bg-[#dae2ff]',
    iconColor: 'text-[#001848]',
  },
  good: {
    borderClass: 'border-l-4 border-l-[#22C55E]',
    valueColor: 'text-[#22C55E]',
    iconBg: '',
    iconColor: 'text-[#22C55E]',
  },
  fair: {
    borderClass: 'border-l-4 border-l-[#EAB308]',
    valueColor: 'text-[#EAB308]',
    iconBg: '',
    iconColor: 'text-[#EAB308]',
  },
  bad: {
    borderClass: 'border-l-4 border-l-[#EF4444]',
    valueColor: 'text-[#EF4444]',
    iconBg: '',
    iconColor: 'text-[#EF4444]',
  },
  poor: {
    borderClass: 'border-l-4 border-l-[#F97316]',
    valueColor: 'text-[#F97316]',
    iconBg: '',
    iconColor: 'text-[#F97316]',
  },
};

const VARIANT_ICONS_FILL: Record<string, boolean> = {
  good: true,
  fair: true,
  poor: true,
  bad: true,
};

export function KpiCard({ label, value, icon, variant = 'default', subtitle }: KpiCardProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className={`bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-sm flex flex-col justify-between ${styles.borderClass}`}
    >
      <p className="font-mono text-[12px] leading-[16px] tracking-[0.05em] font-medium text-[#434652] uppercase">
        {label}
      </p>
      <div className="flex items-end justify-between mt-2">
        <div>
          <span className={`text-[32px] leading-[40px] tracking-[-0.02em] font-bold ${styles.valueColor}`}>
            {value}
          </span>
          {subtitle && (
            <p className="text-[12px] text-[#434652] mt-0.5">{subtitle}</p>
          )}
        </div>
        {variant === 'default' || variant === 'primary' ? (
          <div
            className={`h-10 w-10 ${styles.iconBg} rounded-md flex items-center justify-center ${styles.iconColor}`}
          >
            <span className="material-symbols-outlined">{icon}</span>
          </div>
        ) : (
          <span
            className={`material-symbols-outlined ${styles.iconColor} text-[32px]`}
            style={
              VARIANT_ICONS_FILL[variant]
                ? { fontVariationSettings: "'FILL' 1" }
                : undefined
            }
          >
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}
