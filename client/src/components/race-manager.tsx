import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Users, MapPin, Calendar, Route, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Race {
  id: number;
  name: string;
  date: string;
  city: string;
  state: string;
  distance: string;
  participants: number;
  distanceMiles?: string;
  courseType?: string;
  elevation?: string;
  weather?: string;
}

export function RaceManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { data: races = [], isLoading } = useQuery({
    queryKey: ['/api/races'],
    select: (data: Race[]) => data || []
  });

  const deleteMutation = useMutation({
    mutationFn: async (raceId: number) => {
      return await apiRequest('DELETE', `/api/races/${raceId}`);
    },
    onSuccess: (data, raceId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/races'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
      toast({
        title: "Race deleted",
        description: "Race and all associated results have been deleted successfully."
      });
      setDeleteConfirmId(null);
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete race",
        variant: "destructive"
      });
    }
  });

  const handleDelete = (raceId: number) => {
    deleteMutation.mutate(raceId);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDistanceBadgeColor = (distance: string) => {
    switch (distance.toLowerCase()) {
      case 'marathon': return 'bg-red-100 text-red-800';
      case 'half-marathon': return 'bg-blue-100 text-blue-800';
      case '10k': return 'bg-green-100 text-green-800';
      case '5k': return 'bg-purple-100 text-purple-800';
      case '10-mile': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Race Management</h2>
          <p className="text-gray-600">View and manage imported races</p>
        </div>
        <div className="text-sm text-gray-500">
          {races.length} race{races.length !== 1 ? 's' : ''} total
        </div>
      </div>

      {races.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Route className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No races found</h3>
            <p className="text-gray-600">Import race data to get started with managing races.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {races.map((race) => (
            <Card key={race.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-lg">{race.name}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(race.date)}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {race.city}, {race.state}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {race.participants} participant{race.participants !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getDistanceBadgeColor(race.distance)}>
                      {race.distance}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-sm text-gray-500">
                    {race.distanceMiles && (
                      <span>{race.distanceMiles} miles</span>
                    )}
                    {race.courseType && (
                      <span>{race.courseType}</span>
                    )}
                    {race.elevation && (
                      <span>{race.elevation}</span>
                    )}
                    {race.weather && (
                      <span>{race.weather}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a href={`/race-details/${race.id}`}>
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </a>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Race</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{race.name}"? This action will also delete all {race.participants} race results associated with this race and cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(race.id)}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteMutation.isPending}
                          >
                            {deleteMutation.isPending ? "Deleting..." : "Delete Race"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}