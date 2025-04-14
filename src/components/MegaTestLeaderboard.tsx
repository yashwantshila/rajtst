import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Trophy, Medal, User, ArrowUpRight, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { MegaTestLeaderboardEntry } from '../services/firebase/quiz';
import { useQuery } from '@tanstack/react-query';
import { getUserById } from '../services/firebase/auth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from '../App';

interface MegaTestLeaderboardProps {
  megaTestId: string;
  standalone?: boolean;
}

const MegaTestLeaderboard = ({ megaTestId, standalone = false }: MegaTestLeaderboardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 10;

  const { data: leaderboardData, refetch } = useQuery({
    queryKey: ['leaderboard', megaTestId],
    queryFn: async () => {
      const leaderboardRef = collection(db, 'mega-tests', megaTestId, 'leaderboard');
      const q = query(leaderboardRef, orderBy('score', 'desc'));
      const snapshot = await new Promise<MegaTestLeaderboardEntry[]>((resolve) => {
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const entries = querySnapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
          })) as MegaTestLeaderboardEntry[];

          // Sort entries by score (descending) and then by completion time (ascending)
          entries.sort((a, b) => {
            if (a.score !== b.score) {
              return b.score - a.score; // Higher score first
            }
            // If scores are equal, faster completion gets higher rank
            return a.completionTime - b.completionTime;
          });

          resolve(entries);
          unsubscribe();
        });
      });

      // Fetch user details for each entry
      const entriesWithUserDetails = await Promise.all(
        snapshot.map(async (entry) => {
          const user = await getUserById(entry.userId);
          return {
            ...entry,
            userName: user?.displayName || user?.username || 'Anonymous User',
            userPhotoURL: user?.photoURL,
          };
        })
      );

      return entriesWithUserDetails;
    },
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });

  useEffect(() => {
    const leaderboardRef = collection(db, 'mega-tests', megaTestId, 'leaderboard');
    const q = query(leaderboardRef, orderBy('score', 'desc'));

    const unsubscribe = onSnapshot(q, () => {
      refetch();
    });

    return () => unsubscribe();
  }, [megaTestId, refetch]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const handleOpenLeaderboard = () => {
    navigate(`/leaderboard/${megaTestId}`);
  };

  const filteredData = leaderboardData?.filter(entry => 
    entry.userName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const totalPages = Math.ceil(filteredData.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentEntries = filteredData.slice(startIndex, endIndex);

  const currentUserEntry = leaderboardData?.find(entry => entry.userId === user?.uid);
  const currentUserRank = currentUserEntry ? leaderboardData?.indexOf(currentUserEntry) + 1 : null;

  const jumpToUserRank = () => {
    if (currentUserRank) {
      const page = Math.ceil(currentUserRank / entriesPerPage);
      setCurrentPage(page);
    }
  };

  // Get top 3 entries for the main view
  const topThreeEntries = filteredData.slice(0, 3);

  return (
    <Card className={standalone ? "w-full" : "w-full max-w-md"}>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        {standalone && (
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        )}
        {standalone && currentUserRank && (
          <div className="text-sm text-muted-foreground">
            Your rank: {currentUserRank}
            <Button
              variant="link"
              className="px-0 h-auto font-normal"
              onClick={jumpToUserRank}
            >
              (Jump to my rank)
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {standalone ? (
          <>
            <div className="space-y-4">
              {currentEntries.map((entry, index) => (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    entry.userId === user?.uid
                      ? 'bg-primary/10 border border-primary'
                      : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8">
                      {getRankIcon(startIndex + index + 1) || (
                        <span className="text-muted-foreground">{startIndex + index + 1}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.userPhotoURL ? (
                        <img
                          src={entry.userPhotoURL}
                          alt={entry.userName}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="font-medium">{entry.userName}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="font-semibold">{entry.score} points</div>
                    <div className="text-sm text-muted-foreground">
                      {Math.floor(entry.completionTime / 60)}m {entry.completionTime % 60}s
                    </div>
                  </div>
                </div>
              ))}
              {(!leaderboardData || leaderboardData.length === 0) && (
                <div className="text-center text-muted-foreground py-4">
                  No entries yet
                </div>
              )}
              {filteredData.length === 0 && searchQuery && (
                <div className="text-center text-muted-foreground py-4">
                  No results found
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {topThreeEntries.map((entry, index) => (
              <div
                key={entry.userId}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  entry.userId === user?.uid
                    ? 'bg-primary/10 border border-primary'
                    : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8">
                    {getRankIcon(index + 1)}
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.userPhotoURL ? (
                      <img
                        src={entry.userPhotoURL}
                        alt={entry.userName}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <span className="font-medium">{entry.userName}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="font-semibold">{entry.score} points</div>
                  <div className="text-sm text-muted-foreground">
                    {Math.floor(entry.completionTime / 60)}m {entry.completionTime % 60}s
                  </div>
                </div>
              </div>
            ))}
            {(!leaderboardData || leaderboardData.length === 0) && (
              <div className="text-center text-muted-foreground py-4">
                No entries yet
              </div>
            )}
          </div>
        )}
      </CardContent>
      {!standalone && (
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={handleOpenLeaderboard}>
            <ArrowUpRight className="h-4 w-4 mr-2" />
            View Full Leaderboard
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default MegaTestLeaderboard; 