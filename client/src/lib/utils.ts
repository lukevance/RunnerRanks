import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatTime(timeStr: string): string {
  // Already in HH:MM:SS or MM:SS format
  return timeStr;
}

export function calculatePace(timeStr: string, distanceMiles: number): string {
  const totalSeconds = timeToSeconds(timeStr);
  const paceSecondsPerMile = totalSeconds / distanceMiles;
  
  const minutes = Math.floor(paceSecondsPerMile / 60);
  const seconds = Math.round(paceSecondsPerMile % 60);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function timeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]; // MM:SS
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
  }
  return 0;
}

export function getPerformanceLevel(timeStr: string, distance: string, gender: string, age: number): {
  level: string;
  color: string;
  description: string;
} {
  const totalSeconds = timeToSeconds(timeStr);
  
  // Performance benchmarks (in seconds) - these are realistic times for different levels
  const benchmarks: { [key: string]: { [key: string]: number[] } } = {
    marathon: {
      M: [7200, 8400, 9000, 10800, 12600], // 2:00, 2:20, 2:30, 3:00, 3:30
      F: [7800, 9000, 9600, 11400, 13200]  // 2:10, 2:30, 2:40, 3:10, 3:40
    },
    'half-marathon': {
      M: [3600, 4200, 4500, 5400, 6300], // 1:00, 1:10, 1:15, 1:30, 1:45
      F: [3900, 4500, 4800, 5700, 6600]  // 1:05, 1:15, 1:20, 1:35, 1:50
    }
  };
  
  const distanceKey = distance === 'marathon' ? 'marathon' : 'half-marathon';
  const genderBenchmarks = benchmarks[distanceKey]?.[gender] || benchmarks[distanceKey]['M'];
  
  if (!genderBenchmarks) {
    return { level: 'Finisher', color: 'text-slate-600', description: 'Great effort!' };
  }
  
  if (totalSeconds <= genderBenchmarks[0]) {
    return { level: 'Elite', color: 'text-purple-600', description: 'Elite performance' };
  } else if (totalSeconds <= genderBenchmarks[1]) {
    return { level: 'Competitive', color: 'text-red-600', description: 'Highly competitive' };
  } else if (totalSeconds <= genderBenchmarks[2]) {
    return { level: 'Strong', color: 'text-orange-600', description: 'Strong performance' };
  } else if (totalSeconds <= genderBenchmarks[3]) {
    return { level: 'Good', color: 'text-green-600', description: 'Good time' };
  } else if (totalSeconds <= genderBenchmarks[4]) {
    return { level: 'Solid', color: 'text-blue-600', description: 'Solid finish' };
  } else {
    return { level: 'Finisher', color: 'text-slate-600', description: 'Great effort!' };
  }
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function getAgeGroup(age: number): string {
  if (age < 18) return "Under 18";
  if (age <= 29) return "18-29";
  if (age <= 39) return "30-39";
  if (age <= 49) return "40-49";
  if (age <= 59) return "50-59";
  return "60+";
}

export function getRankDisplay(rank: number): { 
  className: string; 
  text: string; 
} {
  if (rank === 1) {
    return {
      className: "w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center",
      text: "1"
    };
  }
  return {
    className: "w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center",
    text: rank.toString()
  };
}

export function getAvatarGradient(name: string): string {
  const gradients = [
    "from-blue-500 to-green-500",
    "from-purple-500 to-pink-500",
    "from-green-500 to-blue-500",
    "from-orange-500 to-red-500",
    "from-teal-500 to-cyan-500",
    "from-indigo-500 to-purple-500",
    "from-pink-500 to-rose-500",
    "from-yellow-500 to-orange-500"
  ];
  
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}
