import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { FilterControls } from "@/components/filter-controls";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { Filter, ChevronDown, ChevronUp } from "lucide-react";

export default function Leaderboard() {
  const [location] = useLocation();
  const [showFilters, setShowFilters] = useState(false);
  
  // Parse distance from URL params
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const distanceFromUrl = urlParams.get('distance');
  
  const [filters, setFilters] = useState({
    distance: distanceFromUrl || "All Distances",
    gender: "All",
    ageGroup: "All Ages", 
    search: ""
  });

  // Update filters when URL changes
  useEffect(() => {
    if (distanceFromUrl) {
      setFilters(prev => ({ ...prev, distance: distanceFromUrl }));
    }
  }, [distanceFromUrl]);

  const getDistanceLabel = (distance: string) => {
    switch (distance) {
      case 'marathon': return 'Marathon';
      case 'half-marathon': return 'Half Marathon';
      case '10-mile': return '10 Mile';
      case '10k': return '10K';
      case '5k': return '5K';
      default: return 'All Distances';
    }
  };

  const pageTitle = filters.distance === "All Distances" 
    ? "All Distances Leaderboard"
    : `${getDistanceLabel(filters.distance)} Leaderboard`;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">{pageTitle}</h2>
              <p className="text-slate-600">Complete rankings and race results</p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Filter Controls */}
        {showFilters && (
          <div className="mb-8">
            <FilterControls filters={filters} onFiltersChange={setFilters} />
          </div>
        )}

        {/* Leaderboard Table */}
        <LeaderboardTable filters={filters} />
      </main>
    </div>
  );
}