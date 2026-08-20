'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { useFederatedModels } from '@/lib/hooks/use-federated-models';

export function FederatedTrainingPanel() {
  const { models, isLoading, error } = useFederatedModels();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Federated Learning Model Registry & Training Rounds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {models.map((model) => (
              <div key={model.modelId} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{model.name}</span>
                  <Badge variant="info">{model.domain}</Badge>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Round: {model.currentRound} | Architecture: {model.architecture}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
