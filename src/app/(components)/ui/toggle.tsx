// ui/toggle.tsx
import React from 'react';

export interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Indique si le bouton est activé (pressed)
   */
  pressed?: boolean;
}

/**
 * Composant Toggle
 *
 * Ce composant représente un bouton pouvant être en état « pressed » ou non.
 * Il transmet l'attribut ARIA `aria-pressed` pour une meilleure accessibilité.
 */
export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ pressed, className = '', children, ...props }, ref) => {
    return (
      <button
        type="button"
        aria-pressed={pressed}
        ref={ref}
        className={`inline-flex items-center justify-center rounded-md px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Toggle.displayName = 'Toggle';

export default Toggle;
