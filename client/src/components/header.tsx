import { Link, useLocation } from "wouter";
import { Terminal } from "lucide-react";

export function Header() {
  const [location] = useLocation();

  return (
    <header className="bg-white shadow-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="bg-performance-blue rounded-lg p-2">
              <Terminal className="text-white text-xl w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">RunnerBoard</h1>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/">
              <a className={`transition-colors pb-4 ${
                location === "/" 
                  ? "text-performance-blue font-medium border-b-2 border-performance-blue" 
                  : "text-slate-600 hover:text-slate-900"
              }`}>
                Leaderboard
              </a>
            </Link>
            <a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">
              My Profile
            </a>
            <a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">
              Add Result
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
