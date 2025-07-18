import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, XCircle, Clock, User, MapPin, Calendar, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface RunnerReview {
  id: number;
  runner: {
    id: number;
    name: string;
    email?: string;
    gender?: string;
    age?: number;
    city?: string;
    state?: string;
  };
  race: {
    id: number;
    name: string;
    date: string;
    city: string;
    state: string;
    distance: string;
  };
  finishTime: string;
  overallPlace: number;
  genderPlace?: number;
  ageGroupPlace?: number;
  matchingScore: number;
  needsReview: boolean;
  rawRunnerName?: string;
  rawLocation?: string;
  rawAge?: number;
  sourceProvider?: string;
  importedAt?: string;
}

interface RunnerMatch {
  id: number;
  candidateRunnerId?: number;
  rawRunnerData: string;
  matchScore: number;
  matchReasons: string[];
  status: string;
  sourceProvider: string;
  sourceRaceId: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export default function RunnerReview() {
  const [activeTab, setActiveTab] = useState("results");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingReviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ["/api/runner-reviews"],
    enabled: activeTab === "results"
  });

  const { data: pendingMatches, isLoading: matchesLoading } = useQuery({
    queryKey: ["/api/runner-matches"],
    enabled: activeTab === "matches"
  });

  const approveMatchMutation = useMutation({
    mutationFn: async ({ matchId, reviewedBy }: { matchId: number; reviewedBy: string }) => {
      return await apiRequest(`/api/runner-matches/${matchId}/approve`, {
        method: "PATCH",
        body: { reviewedBy }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/runner-matches"] });
      toast({
        title: "Match Approved",
        description: "Runner match has been approved successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to approve runner match. Please try again.",
        variant: "destructive"
      });
    }
  });

  const rejectMatchMutation = useMutation({
    mutationFn: async ({ matchId, reviewedBy }: { matchId: number; reviewedBy: string }) => {
      return await apiRequest(`/api/runner-matches/${matchId}/reject`, {
        method: "PATCH",
        body: { reviewedBy }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/runner-matches"] });
      toast({
        title: "Match Rejected",
        description: "Runner match has been rejected successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reject runner match. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleApprove = (matchId: number) => {
    approveMatchMutation.mutate({ matchId, reviewedBy: "admin" });
  };

  const handleReject = (matchId: number) => {
    rejectMatchMutation.mutate({ matchId, reviewedBy: "admin" });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.replace(/^0:/, "").replace(/^0/, "");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const getScoreColor = (score: number) => {
    if (score >= 95) return "bg-green-500";
    if (score >= 85) return "bg-yellow-500";
    if (score >= 60) return "bg-orange-500";
    return "bg-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 95) return "Auto Match";
    if (score >= 85) return "High Confidence";
    if (score >= 60) return "Medium Confidence";
    return "Low Confidence";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Runner Review</h1>
        <p className="text-muted-foreground">
          Review and manage runner matches that need manual verification
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="results" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Results Needing Review
            {pendingReviews && (
              <Badge variant="secondary" className="ml-2">
                {pendingReviews.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="matches" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Pending Matches
            {pendingMatches && (
              <Badge variant="secondary" className="ml-2">
                {pendingMatches.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="space-y-6">
          {reviewsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : pendingReviews && pendingReviews.length > 0 ? (
            <div className="space-y-4">
              {pendingReviews.map((review: RunnerReview) => (
                <Card key={review.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{review.runner.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`${getScoreColor(review.matchingScore)} text-white`}
                        >
                          {getScoreLabel(review.matchingScore)} ({review.matchingScore}%)
                        </Badge>
                        <Badge variant="outline" className="bg-orange-500 text-white">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Needs Review
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Race Details</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4" />
                            <span>{review.race.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(review.race.date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{review.race.city}, {review.race.state}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Performance</h4>
                        <div className="space-y-1 text-sm">
                          <div><strong>Time:</strong> {formatTime(review.finishTime)}</div>
                          <div><strong>Overall Place:</strong> {review.overallPlace}</div>
                          {review.genderPlace && (
                            <div><strong>Gender Place:</strong> {review.genderPlace}</div>
                          )}
                          {review.ageGroupPlace && (
                            <div><strong>Age Group:</strong> {review.ageGroupPlace}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {(review.rawRunnerName || review.rawLocation || review.rawAge) && (
                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-2">Original Data</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          {review.rawRunnerName && (
                            <div>
                              <strong>Name:</strong> {review.rawRunnerName}
                            </div>
                          )}
                          {review.rawLocation && (
                            <div>
                              <strong>Location:</strong> {review.rawLocation}
                            </div>
                          )}
                          {review.rawAge && (
                            <div>
                              <strong>Age:</strong> {review.rawAge}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        {review.sourceProvider && (
                          <span>Source: {review.sourceProvider}</span>
                        )}
                        {review.importedAt && (
                          <span className="ml-4">
                            Imported: {formatDate(review.importedAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                        <Button size="sm" variant="outline">
                          Edit Match
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                No runner results need review at this time. All recent imports have been processed successfully.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="matches" className="space-y-6">
          {matchesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : pendingMatches && pendingMatches.length > 0 ? (
            <div className="space-y-4">
              {pendingMatches.map((match: RunnerMatch) => {
                const rawData = JSON.parse(match.rawRunnerData);
                return (
                  <Card key={match.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {rawData.name || "Unknown Runner"}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`${getScoreColor(match.matchScore)} text-white`}
                          >
                            {getScoreLabel(match.matchScore)} ({match.matchScore}%)
                          </Badge>
                          <Badge variant="outline" className="bg-blue-500 text-white">
                            <Clock className="w-3 h-3 mr-1" />
                            {match.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Raw Data</h4>
                          <div className="space-y-1 text-sm">
                            <div><strong>Name:</strong> {rawData.name}</div>
                            {rawData.age && <div><strong>Age:</strong> {rawData.age}</div>}
                            {rawData.gender && <div><strong>Gender:</strong> {rawData.gender}</div>}
                            {rawData.city && <div><strong>City:</strong> {rawData.city}</div>}
                            {rawData.state && <div><strong>State:</strong> {rawData.state}</div>}
                            {rawData.finishTime && <div><strong>Time:</strong> {formatTime(rawData.finishTime)}</div>}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Match Details</h4>
                          <div className="space-y-1 text-sm">
                            <div><strong>Source:</strong> {match.sourceProvider}</div>
                            <div><strong>Race ID:</strong> {match.sourceRaceId}</div>
                            <div><strong>Created:</strong> {formatDate(match.createdAt)}</div>
                            {match.matchReasons && match.matchReasons.length > 0 && (
                              <div>
                                <strong>Match Reasons:</strong>
                                <ul className="mt-1 ml-4 list-disc">
                                  {match.matchReasons.map((reason, idx) => (
                                    <li key={idx}>{reason}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Match Score: {match.matchScore}% • Status: {match.status}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleApprove(match.id)}
                            disabled={approveMatchMutation.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleReject(match.id)}
                            disabled={rejectMatchMutation.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                No pending runner matches at this time. All recent matches have been processed.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}