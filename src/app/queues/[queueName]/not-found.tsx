import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function QueueNotFound() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Queue not found
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The queue you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild className="w-full">
            <Link href="/queues">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to queues
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
