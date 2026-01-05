"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export type ConfirmActionType = "retryAll" | "cancelAll" | "purgeCompleted";

const ACTION_DESCRIPTIONS: Record<ConfirmActionType, string> = {
  retryAll: "This will retry all failed jobs in this queue.",
  cancelAll: "This will cancel all pending jobs in this queue.",
  purgeCompleted:
    "This will permanently delete all completed jobs from this queue.",
};

interface ConfirmDialogProps {
  open: boolean;
  actionType: ConfirmActionType | null;
  queueName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  actionType,
  queueName,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (input !== queueName) return;

    setIsSubmitting(true);
    try {
      await onConfirm();
      setInput("");
      onCancel();
    } catch (error) {
      // Error handling is done in the parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setInput("");
    onCancel();
  };

  if (!actionType) return null;

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Action</DialogTitle>
          <DialogDescription>
            {ACTION_DESCRIPTIONS[actionType]}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm mb-2">
            Type <span className="font-mono font-bold">{queueName}</span> to
            confirm:
          </p>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={queueName}
            disabled={isSubmitting}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={input !== queueName || isSubmitting}
            variant="destructive"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
