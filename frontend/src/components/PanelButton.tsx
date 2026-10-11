import type { ButtonHTMLAttributes, Ref } from 'react';

type PanelButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  ref?: Ref<HTMLButtonElement>;
  iconOnly?: boolean;
  tone?: 'safe' | 'warning' | 'danger';
};

export function PanelButton({ iconOnly, tone, className = '', ...props }: PanelButtonProps) {
  return <button type="button" className={`panel-control ${iconOnly ? 'panel-control-icon' : ''} ${className}`} data-tone={tone} {...props} />;
}