"use client";

import { DatabaseForm } from "@/components/settings/database-form";
import { DatabaseList } from "@/components/settings/database-list";
import { HealthThresholdsForm } from "@/components/settings/health-thresholds-form";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your database connections and preferences
          </p>
        </div>
        <DatabaseForm />
      </div>

      <DatabaseList />

      <HealthThresholdsForm />
    </div>
  );
}
