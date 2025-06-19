import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, User } from "lucide-react";
import { formatTime, getInitials, getAvatarGradient } from "@/lib/utils";
import type { RaceSeriesWithRaces, SeriesLeaderboard } from "@shared/schema";

interface SeriesLeaderboardModalProps {
  series: RaceSeriesWithRaces;
  onClose: () => void;
}

export function SeriesLeaderboardModal({ series, onClose }: SeriesLeaderboardModalProps) {
  const { data: leaderboard, isLoading } = useQuery<SeriesLeaderboard>({
    queryKey: ["/api/race-series", series.id, "leaderboard"],
  });

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-slate-600">#{rank}</span>;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-50 border-yellow-200";
    if (rank === 2) return "bg-gray-50 border-gray-200";
    if (rank === 3) return "bg-amber-50 border-amber-200";
    return "bg-white border-slate-200";
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-performance-blue" />
            <span>{series.name} Leaderboard</span>
          </DialogTitle>
          <DialogDescription>
            {series.description || `Series running from ${new Date(series.startDate).toLocaleDateString()} to ${new Date(series.endDate).toLocaleDateString()}`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                <div className="w-8 h-8 bg-slate-200 rounded"></div>
                <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/4"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-16"></div>
                  <div className="h-3 bg-slate-200 rounded w-12"></div>
                </div>
              </div>
            ))}
          </div>
        ) : leaderboard ? (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">{leaderboard.standings.length}</div>
                <div className="text-sm text-slate-600">Qualified Runners</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">{series.totalRaces}</div>
                <div className="text-sm text-slate-600">Total Races</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">{series.minimumRaces}</div>
                <div className="text-sm text-slate-600">Min Required</div>
              </div>
            </div>

            <div className="space-y-3">
              {leaderboard.standings.map((standing) => (
                <div
                  key={standing.runner.id}
                  className={`flex items-center space-x-4 p-4 border rounded-lg transition-all ${getRankColor(standing.rank)}`}
                >
                  <div className="flex items-center justify-center w-8">
                    {getRankIcon(standing.rank)}
                  </div>

                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                    style={{ background: getAvatarGradient(standing.runner.name) }}
                  >
                    {getInitials(standing.runner.name)}
                  </div>

                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{standing.runner.name}</div>
                    <div className="text-sm text-slate-600">
                      {standing.runner.city}, {standing.runner.state} • Age {standing.runner.age}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-lg font-bold text-slate-900">{standing.totalPoints}</div>
                    <div className="text-xs text-slate-500">Total Points</div>
                  </div>

                  <div className="text-center">
                    <div className="text-sm font-medium text-slate-700">{standing.averagePoints.toFixed(1)}</div>
                    <div className="text-xs text-slate-500">Avg Points</div>
                  </div>

                  <div className="text-center">
                    <div className="text-sm font-medium text-slate-700">{standing.racesCompleted}</div>
                    <div className="text-xs text-slate-500">Races</div>
                  </div>

                  <div className="text-center">
                    <div className="text-sm font-medium text-slate-700">{standing.bestRacePoints}</div>
                    <div className="text-xs text-slate-500">Best Race</div>
                  </div>
                </div>
              ))}
            </div>

            {leaderboard.standings.length === 0 && (
              <div className="text-center py-12">
                <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No qualified runners yet</h3>
                <p className="text-slate-600">
                  Runners need to complete at least {series.minimumRaces} race{series.minimumRaces !== 1 ? 's' : ''} to appear on the leaderboard
                </p>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-lg">
              <h4 className="font-medium text-slate-900 mb-3">Scoring Information</h4>
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
              <div className="mt-3 text-xs text-slate-500">
                Points are calculated based on finishing position with bonuses for larger races. 
                1st place = 100 points, 2nd = 95 points, etc.
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Unable to load leaderboard</h3>
            <p className="text-slate-600">Please try again later.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}