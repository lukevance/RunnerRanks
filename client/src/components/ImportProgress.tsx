import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock, Users, Trophy, UserPlus, Flag } from 'lucide-react';

interface ImportProgressProps {
  importId: string;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

interface ProgressData {
  status: 'starting' | 'importing' | 'completed' | 'failed' | 'not_found';
  current: number;
  total: number;
  imported: number;
  matched: number;
  newRunners: number;
  needsReview: number;
  errors: number;
  raceName?: string;
  percentage?: number;
  race?: any;
  summary?: string;
  error?: string;
  completedAt?: string;
}

export function ImportProgress({ importId, onComplete, onError }: ImportProgressProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    if (!importId || !isPolling) return;

    const pollProgress = async () => {
      try {
        const response = await fetch(`/api/import/progress/${importId}`);
        const data = await response.json();
        
        setProgress(data);

        if (data.status === 'completed') {
          setIsPolling(false);
          onComplete?.(data);
        } else if (data.status === 'failed') {
          setIsPolling(false);
          onError?.(data.error || 'Import failed');
        } else if (data.status === 'not_found') {
          setIsPolling(false);
          onError?.('Import not found or expired');
        }
      } catch (error) {
        console.error('Error polling import progress:', error);
        // Continue polling on network errors
      }
    };

    pollProgress(); // Initial poll
    const interval = setInterval(pollProgress, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [importId, isPolling, onComplete, onError]);

  if (!progress) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 animate-spin" />
            <span>Initializing import...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (progress.status === 'failed') {
    return (
      <Card className="w-full max-w-2xl mx-auto border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Import Failed</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{progress.error}</p>
        </CardContent>
      </Card>
    );
  }

  if (progress.status === 'not_found') {
    return (
      <Card className="w-full max-w-2xl mx-auto border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-yellow-600">
            <AlertCircle className="h-5 w-5" />
            <span>Import Not Found</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-yellow-600">The import session has expired or was not found.</p>
        </CardContent>
      </Card>
    );
  }

  const percentage = progress.percentage || (progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0);
  const isCompleted = progress.status === 'completed';

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {isCompleted ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <Clock className="h-5 w-5 animate-spin text-blue-600" />
          )}
          <span>
            {isCompleted ? 'Import Completed' : 'Importing Race Results'}
          </span>
        </CardTitle>
        {progress.raceName && (
          <p className="text-sm text-gray-600">{progress.raceName}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{progress.current.toLocaleString()} of {progress.total.toLocaleString()} processed</span>
            {isCompleted && progress.completedAt && (
              <span>Completed {new Date(progress.completedAt).toLocaleTimeString()}</span>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-green-600">
              <Users className="h-4 w-4" />
              <span className="font-semibold">{progress.imported.toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-500">Imported</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-blue-600">
              <Trophy className="h-4 w-4" />
              <span className="font-semibold">{progress.matched.toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-500">Matched</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-purple-600">
              <UserPlus className="h-4 w-4" />
              <span className="font-semibold">{progress.newRunners.toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-500">New Runners</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-orange-600">
              <Flag className="h-4 w-4" />
              <span className="font-semibold">{progress.needsReview.toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-500">Need Review</p>
          </div>
        </div>

        {/* Status and Errors */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant={isCompleted ? "default" : "secondary"}>
              {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
            </Badge>
            {progress.errors > 0 && (
              <Badge variant="destructive">{progress.errors} errors</Badge>
            )}
          </div>
          
          {!isCompleted && (
            <p className="text-sm text-gray-500">
              This may take a few minutes for large races...
            </p>
          )}
        </div>

        {/* Completion Summary */}
        {isCompleted && progress.summary && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm font-medium">{progress.summary}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}