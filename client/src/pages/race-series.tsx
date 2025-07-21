import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Calendar, Users, TrendingUp, ChevronRight } from "lucide-react";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SeriesLeaderboardModal } from "@/components/series-leaderboard-modal";
import { RaceSeriesWithRaces } from "@shared/schema";

export default function RaceSeries() {
  const [selectedSeries, setSelectedSeries] = useState<RaceSeriesWithRaces | null>(null);

  const { data: raceSeries = [], isLoading } = useQuery<RaceSeriesWithRaces[]>({
    queryKey: ["/api/race-series"],
  });

  // Separate active and past series
  const activeSeries = raceSeries.filter((series) => series.isActive);
  const pastSeries = raceSeries.filter((series) => !series.isActive);

  const getSeriesStatus = (series: RaceSeriesWithRaces) => {
    const now = new Date();
    const startDate = new Date(series.startDate);
    const endDate = new Date(series.endDate);
    
    if (now < startDate) return { label: "Upcoming", color: "bg-blue-100 text-blue-800" };
    if (now > endDate) return { label: "Completed", color: "bg-gray-100 text-gray-800" };
    return { label: "Active", color: "bg-green-100 text-green-800" };
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="h-8 bg-slate-200 rounded w-64 mb-2 animate-pulse"></div>
            <div className="h-4 bg-slate-200 rounded w-96 animate-pulse"></div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-slate-200 rounded"></div>
                    <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                    <div className="h-10 bg-slate-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Race Series</h1>
          <p className="text-slate-600">
            Multi-race competitions tracking runner performance across various events
          </p>
        </div>

        {/* Active Series */}
        {activeSeries.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-slate-900 mb-6 flex items-center">
              <TrendingUp className="w-6 h-6 mr-2 text-performance-blue" />
              Active Series
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeSeries.map((series) => {
                const status = getSeriesStatus(series);
                return (
                  <Card 
                    key={series.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-performance-blue"
                    onClick={() => setSelectedSeries(series)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold text-slate-900 mb-1">
                            {series.name}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {series.description || `${series.year} racing series`}
                          </CardDescription>
                        </div>
                        <Badge className={status.color}>
                          {status.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="flex items-center text-sm text-slate-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          {formatDateRange(series.startDate, series.endDate)}
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center text-slate-600">
                            <Trophy className="w-4 h-4 mr-1" />
                            {series.totalRaces} races
                          </div>
                          <div className="flex items-center text-slate-600">
                            <Users className="w-4 h-4 mr-1" />
                            {series.participantCount} runners
                          </div>
                        </div>

                        <div className="pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full group"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSeries(series);
                            }}
                          >
                            View Leaderboard
                            <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Past Series */}
        {pastSeries.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-6 flex items-center">
              <Trophy className="w-6 h-6 mr-2 text-slate-400" />
              Past Series
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pastSeries.map((series) => {
                const status = getSeriesStatus(series);
                return (
                  <Card 
                    key={series.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-slate-300"
                    onClick={() => setSelectedSeries(series)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold text-slate-900 mb-1">
                            {series.name}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {series.description || `${series.year} racing series`}
                          </CardDescription>
                        </div>
                        <Badge className={status.color}>
                          {status.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="flex items-center text-sm text-slate-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          {formatDateRange(series.startDate, series.endDate)}
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center text-slate-600">
                            <Trophy className="w-4 h-4 mr-1" />
                            {series.totalRaces} races
                          </div>
                          <div className="flex items-center text-slate-600">
                            <Users className="w-4 h-4 mr-1" />
                            {series.participantCount} runners
                          </div>
                        </div>

                        <div className="pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full group"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSeries(series);
                            }}
                          >
                            View Results
                            <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {raceSeries.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Race Series Available</h3>
            <p className="text-slate-600 max-w-md mx-auto">
              Race series allow runners to compete across multiple events for overall standings. 
              Check back later for upcoming series.
            </p>
          </div>
        )}
      </main>

      {/* Series Leaderboard Modal */}
      {selectedSeries && (
        <SeriesLeaderboardModal
          series={selectedSeries}
          onClose={() => setSelectedSeries(null)}
        />
      )}
    </div>
  );
}