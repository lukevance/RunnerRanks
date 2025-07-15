import { useState } from "react";
import { Search } from "lucide-react";

interface FilterControlsProps {
  filters: {
    distance: string;
    gender: string;
    ageGroup: string;
    search: string;
  };
  onFiltersChange: (filters: any) => void;
}

export function FilterControls({ filters, onFiltersChange }: FilterControlsProps) {
  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Race Distance
          </label>
          <select 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-performance-blue focus:border-performance-blue"
            value={filters.distance}
            onChange={(e) => handleFilterChange('distance', e.target.value)}
          >
            <option value="All Distances">All Distances</option>
            <option value="marathon">Marathon (26.2 mi)</option>
            <option value="half-marathon">Half Marathon (13.1 mi)</option>
            <option value="10-mile">10 Mile (10.0 mi)</option>
            <option value="10k">10K (6.2 mi)</option>
            <option value="5k">5K (3.1 mi)</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Gender
          </label>
          <select 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-performance-blue focus:border-performance-blue"
            value={filters.gender}
            onChange={(e) => handleFilterChange('gender', e.target.value)}
          >
            <option value="All">All</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="NB">Non-binary</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Age Group
          </label>
          <select 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-performance-blue focus:border-performance-blue"
            value={filters.ageGroup}
            onChange={(e) => handleFilterChange('ageGroup', e.target.value)}
          >
            <option value="All Ages">All Ages</option>
            <option value="18-29">18-29</option>
            <option value="30-39">30-39</option>
            <option value="40-49">40-49</option>
            <option value="50-59">50-59</option>
            <option value="60+">60+</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Search Runner
          </label>
          <div className="relative">
            <input 
              type="search" 
              placeholder="Search by name..." 
              className="w-full px-3 py-2 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-performance-blue focus:border-performance-blue"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
            <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
