"use client";

import { useEffect, useState } from "react";
import { useRef } from "react";
import { colors } from "@/constants/colors";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info" | "delete";
  duration?: number;
  onClose: () => void;
}

interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "delete";
  duration: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const showToast = (
    message: string,
    type: "success" | "error" | "info" | "delete" = "success",
    duration: number = 3000
  ) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: ToastItem = { id, message, type, duration };

    setToasts((prev) => [...prev, newToast]);

    const timeout = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      timeoutRefs.current.delete(id);
    }, duration);

    timeoutRefs.current.set(id, timeout);
  };

  const removeToast = (id: string) => {
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  const ToastContainer = () => (
    <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 space-y-2 w-[calc(100vw-1.5rem)] sm:w-auto sm:max-w-sm">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );

  return { showToast, ToastContainer };
}

export default function Toast({
  message,
  type = "success",
  duration = 3000,
  onClose,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // 애니메이션 완료 후 제거
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getTypeStyles = (): { backgroundColor: string; color: string } => {
    switch (type) {
      case "success":
        return { backgroundColor: "#4f6d52", color: "white" };
      case "delete":
        return { backgroundColor: colors.brown, color: "white" };
      case "error":
        return { backgroundColor: colors.red, color: "white" };
      case "info":
        return { backgroundColor: "#475569", color: "white" };
      default:
        return { backgroundColor: "#4f6d52", color: "white" };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <div
      style={typeStyles}
      className={`px-4 py-3 rounded-xl shadow-soft border border-white/20 backdrop-blur-sm transition-all duration-300 ${
        isVisible ? "opacity-100 translate-y-0 sm:translate-x-0" : "opacity-0 translate-y-1 sm:translate-x-4"
      }`}
    >
      <div className="flex items-center gap-2.5">
        {type === "success" && (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {(type === "delete" || type === "error") && (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {type === "info" && (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        )}
        <span className="font-medium text-sm sm:text-[15px] leading-5">{message}</span>
      </div>
    </div>
  );
}
