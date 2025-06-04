import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import type { RunnerWithStats } from "@shared/schema";
import { formatTime, formatDate, getInitials, getAvatarGradient } from "@/lib/utils";

interface RunnerProfileModalProps {
  runnerId: number;
  onClose: () => void;
}

export function RunnerProfileModal({ runnerId, onClose }: RunnerProfileModalProps) {
  const { data: runner, isLoading } = useQuery<RunnerWithStats>({
    queryKey: ['/api/runners', runnerId],
    queryFn: async () => {
      const response = await fetch(`/api/runners/${runnerId}`);
      if (!response.ok) throw new Error('Failed to fetch runner');
      return response.json();
    }
  });

  if (isLoading || !runner) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
          <div className="animate-pulse">
            <div className="h-16 bg-slate-200 rounded mb-4"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const initials = getInitials(runner.name);
  const gradient = getAvatarGradient(runner.name);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-4">
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <span className="text-white font-bold text-xl">{initials}</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{runner.name}</h3>
              <p className="text-slate-600">
                {runner.gender === "M" ? "Male" : runner.gender === "F" ? "Female" : "Non-binary"} • Age {runner.age} • {runner.city}, {runner.state}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Runner Stats */}
        <div className="p-6 border-b border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">
                {runner.marathonPR || "N/A"}
              </div>
              <div className="text-sm text-slate-600">Marathon PR</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">
                {runner.halfMarathonPR || "N/A"}
              </div>
              <div className="text-sm text-slate-600">Half Marathon PR</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">
                {runner.racesThisYear}
              </div>
              <div className="text-sm text-slate-600">Races This Year</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">
                {runner.ageGroupWins}
              </div>
              <div className="text-sm text-slate-600">Age Group Wins</div>
            </div>
          </div>
        </div>

        {/* Recent Race Results */}
        <div className="p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Recent Race Results</h4>
          <div className="space-y-4">
            {runner.results.map((result) => (
              <div 
                key={result.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
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
                  <div className="font-bold text-slate-900">
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
            
            {runner.results.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                No race results found for this runner.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
