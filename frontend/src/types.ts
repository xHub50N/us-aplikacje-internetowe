export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void | Promise<void>;
}
