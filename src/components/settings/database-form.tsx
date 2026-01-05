"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useDatabaseStore, type DatabaseConnection } from "@/lib/stores/database-store";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  connectionString: z
    .string()
    .min(1, "Connection string is required")
    .refine(
      (val) => val.startsWith("postgresql://") || val.startsWith("postgres://"),
      "Must be a valid PostgreSQL connection string"
    ),
  schema: z.string().min(1, "Schema is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface DatabaseFormProps {
  connection?: DatabaseConnection;
  onSuccess?: () => void;
}

export function DatabaseForm({ connection, onSuccess }: DatabaseFormProps) {
  const [open, setOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);

  const { addConnection, updateConnection } = useDatabaseStore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: connection?.name || "",
      connectionString: connection?.connectionString || "",
      schema: connection?.schema || "pgboss",
    },
  });

  const testConnection = async () => {
    const connectionString = form.getValues("connectionString");
    const schema = form.getValues("schema") || "pgboss";
    if (!connectionString) {
      form.setError("connectionString", { message: "Connection string is required" });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionString, schema }),
      });

      const result = await res.json();
      setTestResult(result);

      if (result.success) {
        toast.success("Connection successful!");
      } else {
        toast.error(result.error || "Connection failed");
      }
    } catch {
      setTestResult({ success: false, error: "Failed to test connection" });
      toast.error("Failed to test connection");
    } finally {
      setTesting(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (connection) {
        await updateConnection(connection.id, values);
        toast.success("Connection updated");
      } else {
        await addConnection(values);
        toast.success("Connection added");
      }

      setOpen(false);
      form.reset();
      setTestResult(null);
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add connection"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {connection ? "Edit Connection" : "Add Connection"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {connection ? "Edit Database Connection" : "Add Database Connection"}
          </DialogTitle>
          <DialogDescription>
            Configure a PostgreSQL database with pg-boss.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Production DB" {...field} />
                  </FormControl>
                  <FormDescription>
                    A friendly name for this connection
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="connectionString"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connection String</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="postgresql://user:pass@localhost:5432/db"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    PostgreSQL connection string
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="schema"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schema</FormLabel>
                  <FormControl>
                    <Input placeholder="pgboss" {...field} />
                  </FormControl>
                  <FormDescription>
                    pg-boss schema name (default: pgboss)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {testResult && (
              <div
                className={`flex items-center gap-2 rounded-md p-3 text-sm ${
                  testResult.success
                    ? "bg-green-500/10 text-green-600"
                    : "bg-red-500/10 text-red-600"
                }`}
              >
                {testResult.success ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Connection successful!
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    {testResult.error}
                  </>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={testConnection}
                disabled={testing}
              >
                {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test Connection
              </Button>
              <Button type="submit">
                {connection ? "Update" : "Add"} Connection
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
