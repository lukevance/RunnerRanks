import { Header } from "@/components/header";
import { ImportDemo } from "@/components/import-demo";

export default function Admin() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Admin Dashboard</h2>
          <p className="text-slate-600">Manage race data imports and runner matching</p>
        </div>

        <ImportDemo />
      </main>
    </div>
  );
}