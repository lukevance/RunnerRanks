import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, X, Calendar, MapPin, Users, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import type { RaceSeriesWithRaces, Race } from "@shared/schema";

interface SeriesRaceManagerProps {
  series: RaceSeriesWithRaces;
  onClose: () => void;
}

export function SeriesRaceManager({ series, onClose }: SeriesRaceManagerProps) {
  const [selectedRaceId, setSelectedRaceId] = useState<string>("");
  const { toast } = useToast();

  const { data: allRaces = [] } = useQuery({
    queryKey: ["/api/races"],
  });

  const addRaceMutation = useMutation({
    mutationFn: async (raceId: number) => {
      const seriesRaceNumber = series.races.length + 1;
      await apiRequest("POST", `/api/race-series/${series.id}/races/${raceId}`, {
        seriesRaceNumber,
        pointsMultiplier: "1.00"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/race-series"] });
      toast({
        title: "Race added",
        description: "Race has been successfully added to the series.",
      });
      setSelectedRaceId("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add race to series.",
        variant: "destructive",
      });
    },
  });

  const removeRaceMutation = useMutation({
    mutationFn: (raceId: number) => 
      apiRequest("DELETE", `/api/race-series/${series.id}/races/${raceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/race-series"] });
      toast({
        title: "Race removed",
        description: "Race has been successfully removed from the series.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove race from series.",
        variant: "destructive",
      });
    },
  });

  // Get races that are not already in this series
  const availableRaces = (allRaces as Race[]).filter(race => 
    !series.races.some(seriesRace => seriesRace.raceId === race.id)
  );

  const handleAddRace = () => {
    if (selectedRaceId) {
      addRaceMutation.mutate(parseInt(selectedRaceId));
    }
  };

  const handleRemoveRace = (raceId: number) => {
    removeRaceMutation.mutate(raceId);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-performance-blue" />
            <span>Manage Races - {series.name}</span>
          </DialogTitle>
          <DialogDescription>
            Add or remove races from this series. Races are scored in the order they're added.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Race Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Add Race to Series</h3>
            
            {availableRaces.length > 0 ? (
              <div className="flex space-x-3">
                <div className="flex-1">
                  <Select value={selectedRaceId} onValueChange={setSelectedRaceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a race to add..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRaces.map((race) => (
                        <SelectItem key={race.id} value={race.id.toString()}>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{race.name}</span>
                            <span className="text-sm text-slate-500">
                              • {new Date(race.date).toLocaleDateString()}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {race.distance}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleAddRace}
                  disabled={!selectedRaceId || addRaceMutation.isPending}
                  className="shrink-0"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Race
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-lg">
                <Trophy className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">All available races have been added to this series.</p>
              </div>
            )}
          </div>

          {/* Current Races Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Races in Series ({series.races.length})</h3>
            
            {series.races.length > 0 ? (
              <div className="grid gap-4">
                {series.races
                  .sort((a, b) => (a.seriesRaceNumber || 0) - (b.seriesRaceNumber || 0))
                  .map((seriesRace) => (
                  <Card key={seriesRace.id} className="border-l-4 border-l-performance-blue">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-8 h-8 bg-performance-blue text-white rounded-full text-sm font-bold">
                            {seriesRace.seriesRaceNumber}
                          </div>
                          
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900">{seriesRace.race.name}</h4>
                            <div className="flex items-center space-x-4 text-sm text-slate-600 mt-1">
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(seriesRace.race.date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-4 h-4" />
                                <span>{seriesRace.race.city}, {seriesRace.race.state}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Users className="w-4 h-4" />
                                <span>{seriesRace.race.totalFinishers} finishers</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <Badge variant="outline" className="mb-2">
                              {seriesRace.race.distance}
                            </Badge>
                            <div className="text-xs text-slate-500">
                              {seriesRace.race.distanceMiles} miles
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleRemoveRace(seriesRace.raceId)}
                          disabled={removeRaceMutation.isPending}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-lg">
                <Trophy className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h4 className="text-lg font-medium text-slate-900 mb-2">No races in series</h4>
                <p className="text-slate-600">Add races from the selection above to start building your series.</p>
              </div>
            )}
          </div>

          {/* Scoring Information */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-medium text-slate-900 mb-3">Series Rules</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Scoring System:</span>
                <span className="ml-2 font-medium capitalize">{series.scoringSystem}</span>
              </div>
              <div>
                <span className="text-slate-600">Minimum Races:</span>
                <span className="ml-2 font-medium">{series.minimumRaces}</span>
              </div>
              {series.maxRacesForScore && (
                <div>
                  <span className="text-slate-600">Max Scoring Races:</span>
                  <span className="ml-2 font-medium">{series.maxRacesForScore}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}