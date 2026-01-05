"use client";

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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePreferencesStore } from "@/lib/stores/preferences-store";
import { toast } from "sonner";

const formSchema = z.object({
  warningFailed: z.number().min(1, "Must be at least 1"),
  warningPending: z.number().min(1, "Must be at least 1"),
  criticalFailed: z.number().min(1, "Must be at least 1"),
  criticalPending: z.number().min(1, "Must be at least 1"),
}).refine(
  (data) => data.criticalFailed > data.warningFailed,
  { message: "Critical threshold must be greater than warning threshold", path: ["criticalFailed"] }
).refine(
  (data) => data.criticalPending > data.warningPending,
  { message: "Critical threshold must be greater than warning threshold", path: ["criticalPending"] }
);

type FormValues = z.infer<typeof formSchema>;

export function HealthThresholdsForm() {
  const { healthThresholds, setHealthThresholds } = usePreferencesStore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      warningFailed: healthThresholds.warning.failed,
      warningPending: healthThresholds.warning.pending,
      criticalFailed: healthThresholds.critical.failed,
      criticalPending: healthThresholds.critical.pending,
    },
  });

  const onSubmit = (values: FormValues) => {
    setHealthThresholds({
      warning: { failed: values.warningFailed, pending: values.warningPending },
      critical: { failed: values.criticalFailed, pending: values.criticalPending },
    });
    toast.success("Health thresholds updated");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Health Thresholds</CardTitle>
        <CardDescription>
          Configure the thresholds for queue health status indicators
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-yellow-600">Warning Thresholds</h3>
                <FormField
                  control={form.control}
                  name="warningFailed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Failed Jobs</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Show warning when failed jobs exceed this value
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="warningPending"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pending Jobs</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Show warning when pending jobs exceed this value
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-red-600">Critical Thresholds</h3>
                <FormField
                  control={form.control}
                  name="criticalFailed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Failed Jobs</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Show critical when failed jobs exceed this value
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="criticalPending"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pending Jobs</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Show critical when pending jobs exceed this value
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Button type="submit">Save Thresholds</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
