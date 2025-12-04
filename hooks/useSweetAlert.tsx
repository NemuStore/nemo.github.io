import { useState, useCallback } from 'react';
import { AlertType } from '@/components/SweetAlert';

interface AlertOptions {
  type: AlertType;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function useSweetAlert() {
  const [alert, setAlert] = useState<{
    visible: boolean;
    options: AlertOptions | null;
  }>({
    visible: false,
    options: null,
  });

  const showAlert = useCallback((options: AlertOptions) => {
    console.log('🔔 useSweetAlert: showAlert called', { visible: true, options });
    setAlert({
      visible: true,
      options,
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlert((prev) => ({
      ...prev,
      visible: false,
    }));
    // Clear options after animation
    setTimeout(() => {
      setAlert({
        visible: false,
        options: null,
      });
    }, 300);
  }, []);

  const showSuccess = useCallback(
    (title: string, message?: string, onConfirm?: () => void) => {
      console.log('🎉 useSweetAlert: showSuccess called', { title, message });
      showAlert({
        type: 'success',
        title,
        message,
        onConfirm,
      });
    },
    [showAlert]
  );

  const showError = useCallback(
    (title: string, message?: string, onConfirm?: () => void) => {
      showAlert({
        type: 'error',
        title,
        message,
        onConfirm,
      });
    },
    [showAlert]
  );

  const showWarning = useCallback(
    (title: string, message?: string, onConfirm?: () => void) => {
      showAlert({
        type: 'warning',
        title,
        message,
        onConfirm,
      });
    },
    [showAlert]
  );

  const showInfo = useCallback(
    (title: string, message?: string, onConfirm?: () => void) => {
      showAlert({
        type: 'info',
        title,
        message,
        onConfirm,
      });
    },
    [showAlert]
  );

  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      onCancel?: () => void,
      confirmText?: string,
      cancelText?: string
    ) => {
      showAlert({
        type: 'confirm',
        title,
        message,
        confirmText,
        cancelText,
        onConfirm,
        onCancel,
      });
    },
    [showAlert]
  );

  return {
    alert,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
  };
}

