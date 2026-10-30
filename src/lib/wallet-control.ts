/** Shared presentation options for chain-specific wallet controls. */
export type WalletControlProps = {
  compact?: boolean;
  menuSide?: 'bottom' | 'top' | 'right';
  className?: string;
  onNavigate?: () => void;
  showNetwork?: boolean;
};
