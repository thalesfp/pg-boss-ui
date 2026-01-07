"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";

interface PasswordContextValue {
  // Check if password has been provided in this session
  isUnlocked: boolean;

  // Stored password (cleared on unmount / page refresh)
  password: string | null;

  // Set password (validates and stores)
  setPassword: (password: string) => void;

  // Clear password from memory (logout)
  clearPassword: () => void;

  // Check if password is valid (for re-prompting on wrong password)
  hasPassword: () => boolean;
}

const PasswordContext = createContext<PasswordContextValue | undefined>(undefined);

export function PasswordProvider({ children }: { children: React.ReactNode }) {
  const [password, setPasswordState] = useState<string | null>(null);
  const passwordRef = useRef<string | null>(null);

  const setPassword = useCallback((pwd: string) => {
    setPasswordState(pwd);
    passwordRef.current = pwd;
  }, []);

  const clearPassword = useCallback(() => {
    setPasswordState(null);
    passwordRef.current = null;
  }, []);

  const hasPassword = useCallback(() => {
    return passwordRef.current !== null;
  }, []);

  return (
    <PasswordContext.Provider
      value={{
        isUnlocked: password !== null,
        password,
        setPassword,
        clearPassword,
        hasPassword,
      }}
    >
      {children}
    </PasswordContext.Provider>
  );
}

export function usePassword() {
  const context = useContext(PasswordContext);
  if (!context) {
    throw new Error("usePassword must be used within PasswordProvider");
  }
  return context;
}
