import { useQuery } from "@tanstack/react-query";
import { X, ExternalLink, Info } from "lucide-react";
import type { Race } from "@shared/schema";
import { formatDate } from "@/lib/utils";

interface RaceDetailModalProps {
  raceId: number;
  onClose: () => void;
}

export function RaceDetailModal({ raceId, onClose }: RaceDetailModalProps) {
  const { data: race, isLoading } = useQuery<Race>({
    queryKey: ['/api/races', raceId],
    queryFn: async () => {
      const response = await fetch(`/api/races/${raceId}`);
      if (!response.ok) throw new Error('Failed to fetch race');
      return response.json();
    }
  });

  if (isLoading || !race) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
          <div className="animate-pulse">
            <div className="h-48 bg-slate-200 rounded mb-4"></div>
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="relative">
          <img 
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300" 
            alt="Marathon start line" 
            className="w-full h-48 object-cover rounded-t-xl"
          />
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-t-xl"></div>
          <div className="absolute inset-0 flex items-center justify-between p-6">
            <div className="text-white">
              <h3 className="text-2xl font-bold">{race.name}</h3>
              <p className="text-white/90">
                {formatDate(race.date)} • {race.city}, {race.state}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Race Information */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">
                {race.totalFinishers.toLocaleString()}
              </div>
              <div className="text-sm text-slate-600">Total Finishers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">
                {race.distanceMiles} mi
              </div>
              <div className="text-sm text-slate-600">Distance</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">
                {race.averageTime}
              </div>
              <div className="text-sm text-slate-600">Average Time</div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-slate-900 mb-3">Race Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Start Time:</span>
                <span className="ml-2 text-slate-900">{race.startTime}</span>
              </div>
              {race.weather && (
                <div>
                  <span className="text-slate-600">Weather:</span>
                  <span className="ml-2 text-slate-900">{race.weather}</span>
                </div>
              )}
              {race.courseType && (
                <div>
                  <span className="text-slate-600">Course:</span>
                  <span className="ml-2 text-slate-900 capitalize">
                    {race.courseType.replace('-', ' ')}
                  </span>
                </div>
              )}
              {race.elevation && (
                <div>
                  <span className="text-slate-600">Elevation:</span>
                  <span className="ml-2 text-slate-900">{race.elevation}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex space-x-4">
            {race.resultsUrl && (
              <a 
                href={race.resultsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-performance-blue text-white text-center py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Full Results
              </a>
            )}
            {race.organizerWebsite && (
              <a 
                href={race.organizerWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-slate-100 text-slate-700 text-center py-3 px-4 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center"
              >
                <Info className="w-4 h-4 mr-2" />
                Race Info
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
