'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { useFederatedModels } from '@/lib/hooks/use-federated-models';

export function ModelRegistryTab() {
  const { models, isLoading, error } = useFederatedModels();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Federated Global Model Registry</h3>
          <p className="text-sm text-muted-foreground">
            Distributed neural and statistical models trained across edge campus nodes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {models.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              No federated models registered yet. Models will appear once initialized.
            </CardContent>
          </Card>
        ) : (
          models.map((model) => (
            <Card key={model.modelId} className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold">{model.name}</CardTitle>
                <Badge variant={model.status === 'converged' ? 'success' : 'info'}>
                  {model.status.toUpperCase()}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model ID:</span>
                  <span className="font-mono">{model.modelId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Domain:</span>
                  <span className="capitalize">{model.domain}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Architecture:</span>
                  <span className="font-mono text-xs">{model.architecture}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Round:</span>
                  <span className="font-bold">Round {model.currentRound}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dimensions:</span>
                  <span>{model.inputDimensions} In / {model.outputDimensions} Out</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
