import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Clock, Calendar } from "lucide-react";
import { Header } from "@/components/header";
import { FilterControls } from "@/components/filter-controls";
import { LeaderboardTable } from "@/components/leaderboard-table";

export default function Home() {
  const [filters, setFilters] = useState({
    distance: "All Distances",
    gender: "All",
    ageGroup: "All Ages",
    search: ""
  });

  // Get stats for the quick stats section
  const { data: stats } = useQuery({
    queryKey: ['/api/leaderboard', { limit: 1000 }], // Get all entries for stats
    queryFn: async () => {
      const response = await fetch('/api/leaderboard?limit=1000');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });

  const totalRunners = stats?.length || 0;
  const fastestTime = stats?.[0]?.result?.finishTime || "N/A";
  
  // Count unique races
  const uniqueRaces = stats ? new Set(stats.map((entry: any) => entry.race.id)).size : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Local Leaderboard</h2>
          <p className="text-slate-600">Top marathon and half-marathon times in your area</p>
        </div>

        {/* Filter Controls */}
        <FilterControls filters={filters} onFiltersChange={setFilters} />

        {/* Leaderboard Table */}
        <LeaderboardTable filters={filters} />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-performance-blue/10 rounded-lg flex items-center justify-center">
                <Trophy className="text-performance-blue w-6 h-6" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-slate-900">
                  {totalRunners.toLocaleString()}
                </div>
                <div className="text-sm text-slate-600">Total Runners</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-achievement-green/10 rounded-lg flex items-center justify-center">
                <Clock className="text-achievement-green w-6 h-6" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-slate-900">
                  {fastestTime}
                </div>
                <div className="text-sm text-slate-600">Fastest Time</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Calendar className="text-amber-500 w-6 h-6" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-slate-900">
                  {uniqueRaces}
                </div>
                <div className="text-sm text-slate-600">Races This Year</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
