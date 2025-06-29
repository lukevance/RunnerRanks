import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import type { Race } from "@shared/schema";

const raceSeriesSchema = z.object({
  name: z.string().min(1, "Series name is required"),
  description: z.string().optional(),
  year: z.number().min(2020).max(2030),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  scoringSystem: z.enum(["points", "time", "placement"]).default("points"),
  minimumRaces: z.number().min(1).max(10).default(2),
  maxRacesForScore: z.number().optional(),
  isActive: z.boolean().default(true),
});

type RaceSeriesFormData = z.infer<typeof raceSeriesSchema>;

interface RaceSeriesFormProps {
  onClose: () => void;
}

export function RaceSeriesForm({ onClose }: RaceSeriesFormProps) {
  const [selectedRaceIds, setSelectedRaceIds] = useState<number[]>([]);
  const { toast } = useToast();

  const form = useForm<RaceSeriesFormData>({
    resolver: zodResolver(raceSeriesSchema),
    defaultValues: {
      year: new Date().getFullYear(),
      scoringSystem: "points",
      minimumRaces: 2,
      isActive: true,
    },
  });

  const { data: races = [] } = useQuery({
    queryKey: ["/api/races"],
  });

  const createSeriesMutation = useMutation({
    mutationFn: async (data: RaceSeriesFormData) => {
      const response = await apiRequest("POST", "/api/race-series", data);
      return response.json();
    },
    onSuccess: async (series) => {
      // Add selected races to the series
      if (selectedRaceIds.length > 0) {
        for (const raceId of selectedRaceIds) {
          await apiRequest("POST", `/api/race-series/${series.id}/races/${raceId}`, {});
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/race-series"] });
      toast({
        title: "Series created",
        description: `${series.name} has been created successfully.`,
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create race series.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RaceSeriesFormData) => {
    createSeriesMutation.mutate(data);
  };

  const toggleRaceSelection = (raceId: number) => {
    setSelectedRaceIds(prev => 
      prev.includes(raceId) 
        ? prev.filter(id => id !== raceId)
        : [...prev, raceId]
    );
  };

  const currentYear = new Date().getFullYear();
  const availableRaces = races.filter((race: Race) => 
    new Date(race.date).getFullYear() === form.watch("year")
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Series Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Bay Area Marathon Series 2024" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year</FormLabel>
                <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => currentYear - 1 + i).map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Brief description of the race series..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="scoringSystem"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scoring System</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="points">Points-based</SelectItem>
                    <SelectItem value="time">Time-based</SelectItem>
                    <SelectItem value="placement">Placement-based</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minimumRaces"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum Races</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1" 
                    max="10"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                  />
                </FormControl>
                <FormDescription>
                  Minimum races to qualify for leaderboard
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxRacesForScore"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Scoring Races (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1" 
                    max="20"
                    placeholder="All races"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormDescription>
                  Max races counted toward final score
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Active Series</FormLabel>
                <FormDescription>
                  Active series appear in public leaderboards
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {availableRaces.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Races for Series</CardTitle>
              <CardDescription>
                Choose races from {form.watch("year")} to include in this series
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableRaces.map((race: Race) => (
                  <div 
                    key={race.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedRaceIds.includes(race.id) 
                        ? 'border-performance-blue bg-blue-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => toggleRaceSelection(race.id)}
                  >
                    <div>
                      <div className="font-medium">{race.name}</div>
                      <div className="text-sm text-slate-500">
                        {new Date(race.date).toLocaleDateString()} • {race.city}, {race.state} • {race.distance}
                      </div>
                    </div>
                    {selectedRaceIds.includes(race.id) && (
                      <Badge variant="default" className="bg-performance-blue">Selected</Badge>
                    )}
                  </div>
                ))}
              </div>
              {selectedRaceIds.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm text-slate-600">
                    {selectedRaceIds.length} race{selectedRaceIds.length !== 1 ? 's' : ''} selected
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createSeriesMutation.isPending}
            className="bg-performance-blue hover:bg-blue-700"
          >
            {createSeriesMutation.isPending ? "Creating..." : "Create Series"}
          </Button>
        </div>
      </form>
    </Form>
  );
}