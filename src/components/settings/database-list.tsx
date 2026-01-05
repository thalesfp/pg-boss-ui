"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Database, MoreVertical, Trash2, Check } from "lucide-react";
import { useDatabaseStore } from "@/lib/stores/database-store";
import { toast } from "sonner";

export function DatabaseList() {
  const { connections, selectedId, setSelectedId, removeConnection } =
    useDatabaseStore();

  const handleDelete = async (id: string, name: string) => {
    try {
      await removeConnection(id);
      toast.success(`Removed connection: ${name}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove connection"
      );
    }
  };

  const handleSelect = async (id: string) => {
    try {
      await setSelectedId(id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to switch database"
      );
    }
  };

  if (connections.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Database className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-center text-muted-foreground">
            No database connections configured.
            <br />
            Add a connection to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {connections.map((connection) => (
        <Card
          key={connection.id}
          className={`cursor-pointer transition-colors hover:bg-muted/50 ${
            selectedId === connection.id ? "border-primary" : ""
          }`}
          onClick={() => handleSelect(connection.id)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-medium">
                {connection.name}
              </CardTitle>
              {selectedId === connection.id && (
                <Badge variant="secondary" className="text-xs">
                  <Check className="mr-1 h-3 w-3" />
                  Active
                </Badge>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(connection.id, connection.name);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Schema: <code className="text-xs">{connection.schema}</code>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {connection.connectionString.replace(
                /\/\/[^/]*@/,
                "//***:***@"
              )}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
