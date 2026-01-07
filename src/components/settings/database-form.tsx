"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { SSLMode } from "@/lib/db/types";

const SSL_MODES = ["disable", "require", "verify-ca", "verify-full"] as const;

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  // Connection string mode
  connectionString: z.string().optional(),
  // Individual fields mode
  host: z.string().optional(),
  port: z.string().optional(),
  database: z.string().optional(),
  user: z.string().optional(),
  password: z.string().optional(),
  sslMode: z.enum(SSL_MODES).optional(),
  // SSL options
  allowSelfSignedCert: z.boolean().optional(),
  caCertificate: z.string().optional(),
  // Shared
  schema: z.string().min(1, "Schema is required"),
});

function buildConnectionString(
  host: string,
  port: string,
  database: string,
  user: string,
  password: string,
  sslMode?: string
): string {
  const encodedPassword = encodeURIComponent(password);
  let connStr = `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}`;

  // Add sslMode as query parameter if provided
  if (sslMode) {
    connStr += `?sslmode=${sslMode}`;
  }

  return connStr;
}

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
  const [mode, setMode] = useState<"connectionString" | "fields">("connectionString");

  const { addConnection, updateConnection } = useDatabaseStore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: connection?.name || "",
      connectionString: connection?.connectionString || "",
      host: "",
      port: "5432",
      database: "",
      user: "",
      password: "",
      sslMode: connection?.sslMode || undefined,
      allowSelfSignedCert: connection?.allowSelfSignedCert || false,
      caCertificate: connection?.caCertificate || "",
      schema: connection?.schema || "pgboss",
    },
  });

  const getConnectionString = (): string | null => {
    if (mode === "connectionString") {
      const connStr = form.getValues("connectionString");
      if (!connStr) {
        form.setError("connectionString", { message: "Connection string is required" });
        return null;
      }
      if (!connStr.startsWith("postgresql://") && !connStr.startsWith("postgres://")) {
        form.setError("connectionString", { message: "Must be a valid PostgreSQL connection string" });
        return null;
      }
      return connStr;
    } else {
      const host = form.getValues("host");
      const port = form.getValues("port") || "5432";
      const database = form.getValues("database");
      const user = form.getValues("user");
      const password = form.getValues("password") || "";

      if (!host) {
        form.setError("host", { message: "Host is required" });
        return null;
      }
      if (!database) {
        form.setError("database", { message: "Database is required" });
        return null;
      }
      if (!user) {
        form.setError("user", { message: "User is required" });
        return null;
      }

      const sslMode = form.getValues("sslMode");
      return buildConnectionString(host, port, database, user, password, sslMode);
    }
  };

  const testConnection = async () => {
    const connectionString = getConnectionString();
    const schema = form.getValues("schema") || "pgboss";
    const allowSelfSignedCert = form.getValues("allowSelfSignedCert") || false;
    const caCertificate = form.getValues("caCertificate") || undefined;
    const sslMode = form.getValues("sslMode");
    if (!connectionString) {
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionString, schema, allowSelfSignedCert, caCertificate, sslMode }),
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
    const connectionString = getConnectionString();
    if (!connectionString) {
      return;
    }

    const connectionData = {
      name: values.name,
      connectionString,
      schema: values.schema,
      allowSelfSignedCert: values.allowSelfSignedCert,
      caCertificate: values.caCertificate,
      sslMode: values.sslMode,
    };

    try {
      if (connection) {
        await updateConnection(connection.id, connectionData);
        toast.success("Connection updated");
      } else {
        await addConnection(connectionData);
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

            <Tabs value={mode} onValueChange={(v) => setMode(v as "connectionString" | "fields")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="connectionString">Connection String</TabsTrigger>
                <TabsTrigger value="fields">Individual Fields</TabsTrigger>
              </TabsList>
            </Tabs>

            {mode === "connectionString" ? (
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
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="host"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Host</FormLabel>
                        <FormControl>
                          <Input placeholder="localhost" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Port</FormLabel>
                        <FormControl>
                          <Input placeholder="5432" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="database"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Database</FormLabel>
                      <FormControl>
                        <Input placeholder="mydb" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="user"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User</FormLabel>
                      <FormControl>
                        <Input placeholder="postgres" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sslMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SSL Mode</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "auto" ? undefined : value)}
                        defaultValue={field.value || "auto"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select SSL mode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="auto">Auto (use connection string)</SelectItem>
                          <SelectItem value="disable">Disable</SelectItem>
                          <SelectItem value="require">Require</SelectItem>
                          <SelectItem value="verify-ca">Verify CA</SelectItem>
                          <SelectItem value="verify-full">Verify Full</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose SSL/TLS mode. "Disable" for no SSL, "Require" to force SSL without
                        certificate verification, "Verify CA" to verify server certificate, or
                        "Verify Full" to also verify hostname.
                        Note: "Prefer" mode is not supported by the database driver.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="allowSelfSignedCert"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Allow self-signed certificates</FormLabel>
                    <FormDescription>
                      Trust connections with self-signed SSL certificates
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="caCertificate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CA Certificate (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                      className="font-mono text-xs h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Paste your CA certificate in PEM format for SSL verification
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
