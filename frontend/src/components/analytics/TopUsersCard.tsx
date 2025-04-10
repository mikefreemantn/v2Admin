'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { RefreshCw, Trophy, User } from 'lucide-react';
import { User as UserType } from '@/components/users/UsersTable';
import { useApiData, useBatchApiData } from '@/hooks/useApiData';

interface TopUserData {
  user_id: string;
  email: string;
  total_calls: number;
}

export function TopUsersCard() {
  const { toast } = useToast();
  const router = useRouter();

  // Use our custom hook to fetch users with caching
  const { 
    data: usersData, 
    error: usersError, 
    isLoading: isLoadingUsers,
    mutate: refreshUsers
  } = useApiData<{ users: UserType[] }>(
    '/admin/users',
    'GET',
    undefined,
    { refreshInterval: 0, cacheTTL: 5 * 60 * 1000 } // Cache for 5 minutes
  );
  
  // State to track API usage data for all users
  const [usageData, setUsageData] = useState<Record<string, any>>({});
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  
  // Fetch API usage data for all users
  useEffect(() => {
    const fetchUsageData = async () => {
      if (!usersData?.users || usersData.users.length === 0) return;
      
      setIsLoadingUsage(true);
      setUsageError(null);
      
      try {
        // Create a map to store usage data by user ID
        const usageMap: Record<string, any> = {};
        
        // Fetch usage data for each user in parallel
        const fetchPromises = usersData.users.map(async (user) => {
          try {
            const response = await fetch('/api/proxy', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                endpoint: `/admin/api-usage?user_id=${user.user_id}`,
                method: 'GET'
              })
            });
            
            if (!response.ok) {
              throw new Error(`Failed to fetch usage data for ${user.email}`);
            }
            
            const responseData = await response.json();
            const data = responseData.data || responseData;
            
            // Store the usage data in our map
            usageMap[user.user_id] = {
              total_calls: data.total_calls || 0,
              api_usage: data.api_usage || []
            };
          } catch (err) {
            console.error(`Error fetching usage for ${user.email}:`, err);
            // Continue with other users even if one fails
          }
        });
        
        // Wait for all fetches to complete
        await Promise.all(fetchPromises);
        
        // Update the state with all usage data
        setUsageData(usageMap);
      } catch (err) {
        console.error('Error fetching usage data:', err);
        setUsageError('Failed to load API usage data');
      } finally {
        setIsLoadingUsage(false);
      }
    };
    
    fetchUsageData();
  }, [usersData]);
  
  // Function to refresh usage data
  const refreshUsage = async () => {
    const fetchUsageData = async () => {
      if (!usersData?.users || usersData.users.length === 0) return;
      
      setIsLoadingUsage(true);
      setUsageError(null);
      
      try {
        // Create a map to store usage data by user ID
        const usageMap: Record<string, any> = {};
        
        // Fetch usage data for each user in parallel
        const fetchPromises = usersData.users.map(async (user) => {
          try {
            const timestamp = new Date().getTime();
            const response = await fetch(`/api/proxy?_t=${timestamp}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                endpoint: `/admin/api-usage?user_id=${user.user_id}`,
                method: 'GET',
                skipCache: true
              })
            });
            
            if (!response.ok) {
              throw new Error(`Failed to fetch usage data for ${user.email}`);
            }
            
            const responseData = await response.json();
            const data = responseData.data || responseData;
            
            // Store the usage data in our map
            usageMap[user.user_id] = {
              total_calls: data.total_calls || 0,
              api_usage: data.api_usage || []
            };
          } catch (err) {
            console.error(`Error fetching usage for ${user.email}:`, err);
            // Continue with other users even if one fails
          }
        });
        
        // Wait for all fetches to complete
        await Promise.all(fetchPromises);
        
        // Update the state with all usage data
        setUsageData(usageMap);
        return true;
      } catch (err) {
        console.error('Error fetching usage data:', err);
        setUsageError('Failed to load API usage data');
        return false;
      } finally {
        setIsLoadingUsage(false);
      }
    };
    
    return fetchUsageData();
  };
  
  // Log data for debugging
  console.log('Users Data:', usersData);
  console.log('Usage Data:', usageData);
  
  // Combine the data from users and usage
  const topUsers: TopUserData[] = usersData?.users
    ? usersData.users.map(user => ({
        user_id: user.user_id,
        email: user.email,
        total_calls: usageData?.[user.user_id]?.total_calls || 0
      }))
      .sort((a, b) => b.total_calls - a.total_calls)
      .slice(0, 10)
    : [];
  
  // Determine loading and error states
  const isLoading = isLoadingUsers || isLoadingUsage;
  const error = usersError || usageError;
  
  // Function to refresh data
  const fetchTopUsers = async () => {
    try {
      await refreshUsers();
      const usageSuccess = await refreshUsage();
      
      if (usageSuccess) {
        toast({
          title: 'Success',
          description: 'Top users data refreshed',
        });
      } else {
        toast({
          title: 'Partial Success',
          description: 'User data refreshed, but API usage data may be incomplete',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      console.error('Error refreshing top users:', err);
      toast({
        title: 'Error',
        description: 'Failed to refresh top users data',
        variant: 'destructive',
      });
    }
  };

  // Get colors for the bars
  const getBarColor = (index: number) => {
    const colors = [
      '#6366f1', // indigo
      '#10b981', // emerald
      '#f59e0b', // amber
      '#f43f5e', // rose
      '#3b82f6', // blue
      '#8b5cf6', // violet
      '#06b6d4', // cyan
      '#d946ef', // fuchsia
      '#22c55e', // green
      '#f97316'  // orange
    ];
    return colors[index % colors.length];
  };

  // Navigate to user profile page
  const navigateToUserProfile = (email: string) => {
    router.push(`/dashboard/users/${encodeURIComponent(email)}`);
  };

  // Format email for display
  const formatEmail = (email: string) => {
    // Extract username part before @ symbol
    const atIndex = email.indexOf('@');
    if (atIndex > 0) {
      const username = email.substring(0, atIndex);
      const domain = email.substring(atIndex + 1);
      // If username is too long, truncate it
      const displayUsername = username.length > 10 ? username.substring(0, 10) + '...' : username;
      return `${displayUsername}@${domain}`;
    }
    return email;
  };

  return (
    <Card className="border-0 bg-gradient-to-br from-background via-background to-background/80 shadow-lg overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl font-bold">Top Users</CardTitle>
          <CardDescription className="text-muted-foreground">
            Users with the highest API usage
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchTopUsers} 
          disabled={isLoading}
          className="flex items-center gap-1"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center text-destructive p-4">
            <p>{error}</p>
            <Button variant="outline" onClick={fetchTopUsers} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : topUsers.length === 0 ? (
          <div className="text-center text-muted-foreground p-4">
            <p>No user data available</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-full h-[300px] px-4 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topUsers.map(user => ({
                    name: formatEmail(user.email),
                    value: user.total_calls,
                    user_id: user.user_id,
                    fullEmail: user.email
                  }))}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 120, bottom: 20 }}
                  onClick={(data) => {
                    if (data && data.activePayload && data.activePayload[0]) {
                      const userEmail = data.activePayload[0].payload.fullEmail;
                      navigateToUserProfile(userEmail);
                    }
                  }}
                >
                  <defs>
                    {topUsers.map((_, index) => (
                      <linearGradient key={`gradient-user-${index}`} id={`color-user-${index}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={getBarColor(index)} stopOpacity={0.8}/>
                        <stop offset="100%" stopColor={getBarColor(index)} stopOpacity={1}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={true} />
                  <XAxis 
                    type="number"
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={{ stroke: '#E2E8F0' }}
                    tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                    domain={[0, 'dataMax + 100']}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name" 
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={{ stroke: '#E2E8F0' }}
                    width={120}
                    tick={{ fontSize: 12, cursor: 'pointer' }}
                    onClick={(data) => {
                      if (data && data.payload) {
                        navigateToUserProfile(data.payload.fullEmail);
                      }
                    }}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value.toLocaleString()} calls`, 'Total API Calls']}
                    labelFormatter={(label, payload) => payload[0]?.payload?.fullEmail || label}
                    contentStyle={{ 
                      borderRadius: '8px', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      border: 'none',
                      padding: '10px 14px'
                    }}
                    cursor={{ fill: 'rgba(136, 132, 216, 0.1)' }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar 
                    dataKey="value" 
                    name="API Calls"
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={true}
                    animationDuration={1500}
                    animationEasing="ease-in-out"
                  >
                    {topUsers.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#color-user-${index})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-2 px-1">
              {topUsers.slice(0, 3).map((user, index) => (
                <div 
                  key={user.user_id} 
                  className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-muted/30 to-muted/50 border border-muted/50 shadow-sm transition-all duration-200 hover:shadow-md hover:bg-muted/70 cursor-pointer"
                  onClick={() => navigateToUserProfile(user.email)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      flex items-center justify-center w-10 h-10 rounded-full 
                      ${index === 0 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' : 
                        index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-300' : 
                        'bg-gradient-to-r from-amber-800 to-amber-700'}
                      text-white font-bold shadow-md
                    `}>
                      {index === 0 ? (
                        <Trophy className="h-5 w-5" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{user.email}</span>
                      <span className="text-xs text-muted-foreground">User ID: {user.user_id}</span>
                    </div>
                  </div>
                  <div className="font-bold text-lg">{user.total_calls.toLocaleString()} calls</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
