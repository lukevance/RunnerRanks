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
