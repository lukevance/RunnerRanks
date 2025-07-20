import { Header } from "@/components/header";
import { ImportDemo } from "@/components/import-demo";
import { RaceSeriesManager } from "@/components/race-series-manager";
import { RaceManager } from "@/components/race-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Admin() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Admin Dashboard</h2>
          <p className="text-slate-600">Manage race data, series, and runner matching</p>
        </div>

        <Tabs defaultValue="import" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="import">Data Import</TabsTrigger>
            <TabsTrigger value="series">Race Series</TabsTrigger>
            <TabsTrigger value="review">Runner Review</TabsTrigger>
            <TabsTrigger value="races">Race Management</TabsTrigger>
            <TabsTrigger value="runners">Runner Management</TabsTrigger>
          </TabsList>

          <TabsContent value="import">
            <ImportDemo />
          </TabsContent>

          <TabsContent value="series">
            <div className="bg-white rounded-lg border p-6">
              <RaceSeriesManager />
            </div>
          </TabsContent>

          <TabsContent value="review">
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-1">Runner Review</h2>
                  <p className="text-slate-600">Review runner matches that need manual verification</p>
                </div>
                <a 
                  href="/runner-review" 
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Open Runner Review
                </a>
              </div>
              <p className="text-slate-600">
                When importing race data, runners are automatically matched to existing profiles using name, age, and location. 
                Some matches require manual verification to ensure data accuracy.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="races">
            <div className="bg-white rounded-lg border p-6">
              <RaceManager />
            </div>
          </TabsContent>

          <TabsContent value="runners">
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Runner Management</h2>
              <p className="text-slate-600">Runner profile management features coming soon...</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}