import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Race {
  id: number;
  name: string;
  date: string;
  city: string;
  state: string;
  distance: string;
  distanceMiles: string;
  participants?: number;
}

interface RacesListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RacesListModal({ isOpen, onClose }: RacesListModalProps) {
  const { data: races = [], isLoading } = useQuery<Race[]>({
    queryKey: ['/api/races'],
    queryFn: async () => {
      const response = await fetch('/api/races');
      if (!response.ok) throw new Error('Failed to fetch races');
      return response.json();
    },
    enabled: isOpen
  });

  const getDistanceDisplay = (distance: string) => {
    switch (distance) {
      case "marathon": return "Marathon (26.2 mi)";
      case "half-marathon": return "Half Marathon (13.1 mi)";
      case "10-mile": return "10 Mile (10.0 mi)";
      case "10k": return "10K (6.2 mi)";
      case "5k": return "5K (3.1 mi)";
      default: return distance;
    }
  };

  const sortedRaces = races.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            All Races ({races.length})
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 border border-slate-200 rounded-lg animate-pulse">
                <div className="h-5 bg-slate-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedRaces.map((race) => (
              <div
                key={race.id}
                className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-2">
                      {race.name}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(race.date)}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {race.city}, {race.state}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {getDistanceDisplay(race.distance)}
                      </div>
                    </div>
                  </div>
                  {race.participants && (
                    <div className="flex items-center gap-1 text-sm text-slate-500 ml-4">
                      <Users className="w-4 h-4" />
                      {race.participants} runners
                    </div>
                  )}
                </div>
              </div>
            ))}
            {races.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                No races found in the system.
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}