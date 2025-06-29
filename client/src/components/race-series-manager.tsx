import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trophy, Calendar, Users, Target, Settings, Eye, Trash2 } from "lucide-react";
import { RaceSeriesForm } from "./race-series-form";
import { SeriesLeaderboardModal } from "./series-leaderboard-modal";
import { SeriesRaceManager } from "./series-race-manager";
import type { RaceSeriesWithRaces } from "@shared/schema";

export function RaceSeriesManager() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<RaceSeriesWithRaces | null>(null);
  const [managingSeries, setManagingSeries] = useState<RaceSeriesWithRaces | null>(null);
  const { toast } = useToast();

  const { data: raceSeries = [], isLoading } = useQuery({
    queryKey: ["/api/race-series"],
  });

  const deleteMutation = useMutation({
    mutationFn: (seriesId: number) => 
      apiRequest("DELETE", `/api/race-series/${seriesId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/race-series"] });
      toast({
        title: "Series deleted",
        description: "Race series has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete race series.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Race Series Management</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-slate-200 rounded"></div>
                  <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Race Series Management</h2>
          <p className="text-slate-600">Create and manage multi-race series competitions</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="bg-performance-blue hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Series
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Race Series</CardTitle>
            <CardDescription>
              Set up a new series to track runner performance across multiple races
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RaceSeriesForm onClose={() => setShowCreateForm(false)} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {raceSeries.map((series: RaceSeriesWithRaces) => (
          <Card key={series.id} className="border-l-4 border-l-performance-blue">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{series.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {series.description || `${series.year} race series`}
                  </CardDescription>
                </div>
                <Badge variant={series.isActive ? "default" : "secondary"}>
                  {series.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600">
                    {new Date(series.startDate).toLocaleDateString()} - {new Date(series.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600">{series.totalRaces} races</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600">{series.participantCount} participants</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600">Min {series.minimumRaces} races</span>
                </div>
              </div>

              {series.races.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Included Races</h4>
                  <div className="space-y-1">
                    {series.races.slice(0, 3).map((raceEntry) => (
                      <div key={raceEntry.id} className="text-sm text-slate-600 flex items-center justify-between">
                        <span>{raceEntry.race.name}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(raceEntry.race.date).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                    {series.races.length > 3 && (
                      <div className="text-xs text-slate-500">
                        +{series.races.length - 3} more races
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSeries(series)}
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Leaderboard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setManagingSeries(series)}
                  className="flex-1"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Manage Races
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMutation.mutate(series.id)}
                  disabled={deleteMutation.isPending}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {raceSeries.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No race series yet</h3>
            <p className="text-slate-600 mb-4">
              Create your first race series to track performance across multiple events
            </p>
            <Button onClick={() => setShowCreateForm(true)} className="bg-performance-blue hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create First Series
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedSeries && (
        <SeriesLeaderboardModal
          series={selectedSeries}
          onClose={() => setSelectedSeries(null)}
        />
      )}

      {managingSeries && (
        <SeriesRaceManager
          series={managingSeries}
          onClose={() => setManagingSeries(null)}
        />
      )}
    </div>
  );
}