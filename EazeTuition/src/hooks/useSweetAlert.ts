import { useState } from "react";
import { AlertType } from "../components/SweetAlertModel";

export interface AlertConfig {
  visible: boolean;
  type: AlertType;
  title?: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onlyConfirm?: boolean;
}

export const useSweetAlert = () => {
  const [alert, setAlert] = useState<AlertConfig>({
    visible: false,
    type: "warning",
    title: "",
    message: "",
    onConfirm: undefined,
    onCancel: undefined,
    onlyConfirm: false,
  });

  const showAlert = (config: Omit<AlertConfig, "visible">) => {
    setAlert({
      visible: true,
      onlyConfirm: config.onlyConfirm ?? false, // default unless explicitly overridden
      ...config,
      onConfirm: config.onConfirm ?? (() => hideAlert()),
    });
  };

  const hideAlert = () => {
    setAlert((prev) => ({ ...prev, visible: false }));
  };

  return {
    alert,
    showAlert,
    hideAlert,
  };
};
