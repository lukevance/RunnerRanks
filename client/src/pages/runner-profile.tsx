import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { RunnerWithStats } from "@shared/schema";
import { Header } from "@/components/header";
import { formatTime, formatDate, getInitials, getAvatarGradient } from "@/lib/utils";

export default function RunnerProfile() {
  const { id } = useParams<{ id: string }>();
  const runnerId = parseInt(id || "0");

  const { data: runner, isLoading, error } = useQuery<RunnerWithStats>({
    queryKey: ['/api/runners', runnerId],
    queryFn: async () => {
      const response = await fetch(`/api/runners/${runnerId}`);
      if (!response.ok) throw new Error('Failed to fetch runner');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-1/4"></div>
            <div className="h-32 bg-slate-200 rounded"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 rounded"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !runner) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Runner Not Found</h2>
            <p className="text-slate-600 mb-6">The runner you're looking for could not be found.</p>
            <Link href="/">
              <a className="bg-performance-blue text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                Return to Leaderboard
              </a>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const initials = getInitials(runner.name);
  const gradient = getAvatarGradient(runner.name);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Link href="/">
          <a className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leaderboard
          </a>
        </Link>

        {/* Runner Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center space-x-6">
            <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <span className="text-white font-bold text-3xl">{initials}</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{runner.name}</h1>
              <p className="text-slate-600 text-lg">
                {runner.gender === "M" ? "Male" : runner.gender === "F" ? "Female" : "Non-binary"} • Age {runner.age} • {runner.city}, {runner.state}
              </p>
            </div>
          </div>
        </div>

        {/* Runner Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <div className="text-3xl font-bold text-slate-900 mb-2">
              {runner.marathonPR || "N/A"}
            </div>
            <div className="text-sm text-slate-600">Marathon PR</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <div className="text-3xl font-bold text-slate-900 mb-2">
              {runner.halfMarathonPR || "N/A"}
            </div>
            <div className="text-sm text-slate-600">Half Marathon PR</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <div className="text-3xl font-bold text-slate-900 mb-2">
              {runner.racesThisYear}
            </div>
            <div className="text-sm text-slate-600">Races This Year</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <div className="text-3xl font-bold text-slate-900 mb-2">
              {runner.ageGroupWins}
            </div>
            <div className="text-sm text-slate-600">Age Group Wins</div>
          </div>
        </div>

        {/* Race Results */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Race Results</h3>
          </div>
          <div className="p-6">
            {runner.results.length > 0 ? (
              <div className="space-y-4">
                {runner.results.map((result) => (
                  <div 
                    key={result.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <img 
                        src="https://images.unsplash.com/photo-1571008887538-b36bb32f4571?ixlib=rb-4.0.3&auto=format&fit=crop&w=60&h=60" 
                        alt="Race finish line" 
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div>
                        <div className="font-medium text-slate-900">{result.race.name}</div>
                        <div className="text-sm text-slate-600">
                          {formatDate(result.race.date)} • {result.race.distanceMiles} mi
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 text-lg">
                        {formatTime(result.finishTime)}
                      </div>
                      <div className={`text-sm ${result.overallPlace <= 3 ? 'text-achievement-green' : 'text-slate-600'}`}>
                        {result.overallPlace === 1 ? "1st Overall" : 
                         result.ageGroupPlace === 1 ? "Age Group Win" : 
                         `${result.overallPlace}${result.overallPlace === 1 ? 'st' : result.overallPlace === 2 ? 'nd' : result.overallPlace === 3 ? 'rd' : 'th'} Overall`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <p>No race results found for this runner.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
