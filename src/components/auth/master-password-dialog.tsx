"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, AlertCircle } from "lucide-react";
import { validatePassword } from "@/lib/crypto";

interface MasterPasswordDialogProps {
  mode: "unlock" | "setup" | "migrate";
  open: boolean;
  onSuccess: (password: string) => void;
  onForgotPassword?: () => void;
  isValidating?: boolean;
  error?: string | null;
}

export function MasterPasswordDialog({
  mode,
  open,
  onSuccess,
  onForgotPassword,
  isValidating = false,
  error = null,
}: MasterPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const isSetupMode = mode === "setup" || mode === "migrate";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate password
    const validation = validatePassword(password);
    if (!validation.valid) {
      setValidationError(validation.error || "Invalid password");
      return;
    }

    // For setup/migrate mode, check confirmation
    if (isSetupMode && password !== confirmPassword) {
      setValidationError("Passwords do not match");
      return;
    }

    onSuccess(password);
  };

  const getTitle = () => {
    switch (mode) {
      case "unlock":
        return "Enter Master Password";
      case "setup":
        return "Create Master Password";
      case "migrate":
        return "Set Master Password";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "unlock":
        return "Enter your master password to access your saved connections.";
      case "setup":
        return "Create a master password to protect your database connections. This password will be required every time you open the app.";
      case "migrate":
        return "We're upgrading your connection security. Please set a master password to protect your existing connections.";
    }
  };

  // Calculate password strength (simple implementation)
  const getPasswordStrength = (pwd: string): { strength: number; label: string; color: string } => {
    if (pwd.length === 0) return { strength: 0, label: "", color: "" };
    if (pwd.length < 6) return { strength: 1, label: "Too short", color: "bg-red-500" };

    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

    if (strength <= 2) return { strength: 2, label: "Weak", color: "bg-orange-500" };
    if (strength <= 3) return { strength: 3, label: "Good", color: "bg-yellow-500" };
    return { strength: 4, label: "Strong", color: "bg-green-500" };
  };

  const passwordStrength = isSetupMode ? getPasswordStrength(password) : null;

  return (
    <Dialog open={open} onOpenChange={() => {}} modal>
      <DialogContent
        className="sm:max-w-[425px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            <DialogTitle>{getTitle()}</DialogTitle>
          </div>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">
              {isSetupMode ? "Master Password" : "Password"}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={isValidating}
              autoFocus
              autoComplete={isSetupMode ? "new-password" : "current-password"}
            />

            {isSetupMode && passwordStrength && passwordStrength.strength > 0 && (
              <div className="space-y-1">
                <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.strength / 4) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Strength: {passwordStrength.label}
                </p>
              </div>
            )}
          </div>

          {isSetupMode && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                disabled={isValidating}
                autoComplete="new-password"
              />
            </div>
          )}

          {(validationError || error) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError || error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={isValidating || !password}>
              {isValidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSetupMode ? "Create Password" : "Unlock"}
            </Button>

            {mode === "unlock" && onForgotPassword && (
              <Button
                type="button"
                variant="ghost"
                onClick={onForgotPassword}
                disabled={isValidating}
                className="text-sm"
              >
                Forgot password? Clear all connections
              </Button>
            )}
          </div>

          {isSetupMode && (
            <p className="text-xs text-muted-foreground">
              <strong>Important:</strong> There is no way to recover your password.
              If you forget it, you'll need to clear all connections and start over.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
