'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { RefreshCw, Trophy, User } from 'lucide-react';
import { User as UserType } from '@/components/users/UsersTable';

interface TopUserData {
  user_id: string;
  email: string;
  total_calls: number;
}

export function TopUsersCard() {
  const [topUsers, setTopUsers] = useState<TopUserData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Fetch all users and their API usage
  const fetchTopUsers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First, fetch all users
      const usersResponse = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: '/admin/users',
          method: 'GET',
        }),
      });
      
      const usersData = await usersResponse.json();
      
      if (!usersResponse.ok) {
        throw new Error(`API request failed with status ${usersResponse.status}: ${JSON.stringify(usersData)}`);
      }
      
      if (usersData.error) {
        throw new Error(usersData.error);
      }
      
      const users = usersData.data.users || [];
      
      // For each user, fetch their API usage
      const userPromises = users.map(async (user: UserType) => {
        try {
          const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              endpoint: '/admin/api-usage',
              method: 'GET',
              queryParams: {
                user_id: user.user_id,
              },
            }),
          });
          
          const data = await response.json();
          
          if (!response.ok || data.error) {
            return {
              user_id: user.user_id,
              email: user.email,
              total_calls: 0,
            };
          }
          
          return {
            user_id: user.user_id,
            email: user.email,
            total_calls: data.data.total_calls || 0,
          };
        } catch (err) {
          console.error(`Error fetching API usage for user ${user.user_id}:`, err);
          return {
            user_id: user.user_id,
            email: user.email,
            total_calls: 0,
          };
        }
      });
      
      const userResults = await Promise.all(userPromises);
      
      // Sort users by total calls (descending) and take top 10
      const sortedUsers = userResults
        .sort((a, b) => b.total_calls - a.total_calls)
        .slice(0, 10);
      
      setTopUsers(sortedUsers);
    } catch (err: any) {
      console.error('Error fetching top users:', err);
      setError(err.message || 'Failed to load top users');
      toast({
        title: 'Error',
        description: err.message || 'Failed to load top users',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load top users when component mounts
  useEffect(() => {
    fetchTopUsers();
  }, []);

  // Get colors for the bars
  const getBarColor = (index: number) => {
    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe',
      '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57'
    ];
    
    return colors[index % colors.length];
  };

  // Format email for display (truncate if too long)
  const formatEmail = (email: string) => {
    if (email.length > 20) {
      return email.substring(0, 17) + '...';
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
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <defs>
                    {topUsers.map((_, index) => (
                      <linearGradient key={`gradient-user-${index}`} id={`color-user-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={getBarColor(index)} stopOpacity={1}/>
                        <stop offset="100%" stopColor={getBarColor(index)} stopOpacity={0.7}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end"
                    height={60}
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={{ stroke: '#E2E8F0' }}
                  />
                  <YAxis 
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={{ stroke: '#E2E8F0' }}
                    width={60}
                    tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
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
                  <Bar 
                    dataKey="value" 
                    name="API Calls"
                    radius={[4, 4, 0, 0]}
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
                  className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-muted/30 to-muted/50 border border-muted/50 shadow-sm transition-all duration-200 hover:shadow-md"
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
