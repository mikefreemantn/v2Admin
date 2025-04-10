'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Search, RefreshCw, UserRound } from 'lucide-react';
import { User } from '@/components/users/UsersTable';

// API key for accessing the ReIntent API
const API_KEY = 'ri_5437c19aa7de';
const API_BASE_URL = 'https://xwkwzbjifh.execute-api.us-east-2.amazonaws.com/v1';

// Types for API usage data
interface ApiUsageByService {
  [key: string]: number;
}

interface ApiUsageData {
  date: string;
  count: number;
  by_service: ApiUsageByService;
}

interface ApiUsageResponse {
  api_usage: ApiUsageData[];
  total_calls: number;
}

export function UserAnalytics() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userApiUsage, setUserApiUsage] = useState<ApiUsageData[]>([]);
  const [totalUserCalls, setTotalUserCalls] = useState<number>(0);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  const [isLoadingUsage, setIsLoadingUsage] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const { toast } = useToast();
  
  // Function to navigate to user profile page
  const navigateToUserProfile = (email: string) => {
    router.push(`/dashboard/users/${encodeURIComponent(email)}`);
  };

  // Fetch users
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    setError(null);
    
    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: '/admin/users',
          method: 'GET',
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(data)}`);
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setUsers(data.data.users || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users');
      toast({
        title: 'Error',
        description: err.message || 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Fetch user API usage
  const fetchUserApiUsage = async (userId: string) => {
    setIsLoadingUsage(true);
    setError(null);
    
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
            user_id: userId,
          },
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(data)}`);
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      const apiData = data.data as ApiUsageResponse;
      
      // Sort data by date (ascending)
      const sortedData = [...apiData.api_usage].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      setUserApiUsage(sortedData);
      setTotalUserCalls(apiData.total_calls);
    } catch (err: any) {
      console.error('Error fetching user API usage data:', err);
      setError(err.message || 'Failed to load user API usage data');
      toast({
        title: 'Error',
        description: err.message || 'Failed to load user API usage data',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingUsage(false);
    }
  };

  // Load users when component mounts
  useEffect(() => {
    fetchUsers();
  }, []);

  // Load user API usage when selected user changes
  useEffect(() => {
    if (selectedUserId) {
      fetchUserApiUsage(selectedUserId);
    } else {
      setUserApiUsage([]);
      setTotalUserCalls(0);
    }
  }, [selectedUserId]);

  // Filter users based on search query
  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.access_key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get services from the data
  const getServices = () => {
    const services = new Set<string>();
    
    userApiUsage.forEach(item => {
      Object.keys(item.by_service).forEach(service => {
        services.add(service);
      });
    });
    
    return Array.from(services);
  };

  // Get colors for services
  const getServiceColor = (service: string, index: number) => {
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00C49F'];
    
    if (service === 'chatgpt') return '#19c37d';
    if (service === 'firecrawl') return '#ff5722';
    
    return colors[index % colors.length];
  };

  const services = getServices();

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d');
    } catch (e) {
      return dateStr;
    }
  };

  // Get selected user
  const selectedUser = users.find(user => user.user_id === selectedUserId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">User Analytics</h2>
          <p className="text-muted-foreground">Monitor API usage for specific users</p>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchUsers} 
          disabled={isLoadingUsers}
          className="flex items-center gap-1"
        >
          <RefreshCw className={`h-4 w-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh Users</span>
        </Button>
      </div>
      
      {/* User Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select User</CardTitle>
          <CardDescription>
            Choose a user to view their API usage analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search users by email or API key..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {isLoadingUsers ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))
              ) : filteredUsers.length === 0 ? (
                <div className="col-span-full text-center py-4 text-muted-foreground">
                  No users found
                </div>
              ) : (
                filteredUsers.map(user => (
                  <div key={user.user_id} className="flex flex-col gap-2">
                    <Button
                      variant={selectedUserId === user.user_id ? "default" : "outline"}
                      className="h-auto py-3 px-4 justify-start w-full"
                      onClick={() => setSelectedUserId(user.user_id)}
                    >
                      <div className="flex flex-col items-start text-left">
                        <div className="font-medium truncate max-w-[200px]">{user.email}</div>
                        <div className="text-xs text-muted-foreground">{user.access_key}</div>
                      </div>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white border-0 shadow-md"
                      onClick={() => navigateToUserProfile(user.email)}
                    >
                      View Profile
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* User API Usage */}
      {selectedUserId && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">User</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-primary" />
                  <div className="text-lg font-medium truncate">{selectedUser?.email}</div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="ml-auto bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white border-0 shadow-md"
                    onClick={() => selectedUser && navigateToUserProfile(selectedUser.email)}
                  >
                    View Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total API Calls</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingUsage ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-3xl font-bold">{totalUserCalls.toLocaleString()}</div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Daily Average</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingUsage ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-3xl font-bold">
                    {userApiUsage.length > 0
                      ? Math.round(
                          userApiUsage.reduce((sum, item) => sum + item.count, 0) / userApiUsage.length
                        ).toLocaleString()
                      : '0'}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* User API Usage Chart */}
          <Card>
            <CardHeader>
              <CardTitle>API Usage Over Time</CardTitle>
              <CardDescription>
                Daily API calls for {selectedUser?.email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsage ? (
                <div className="w-full h-[350px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em]"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Loading chart data...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="w-full h-[350px] flex items-center justify-center">
                  <div className="text-center text-destructive">
                    <p>{error}</p>
                    <Button 
                      variant="outline" 
                      onClick={() => fetchUserApiUsage(selectedUserId)} 
                      className="mt-4"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              ) : userApiUsage.length === 0 ? (
                <div className="w-full h-[350px] flex items-center justify-center">
                  <p className="text-muted-foreground">No API usage data available for this user</p>
                </div>
              ) : (
                <div className="w-full h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={userApiUsage}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={formatDate}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [`${value} calls`, '']}
                        labelFormatter={(label) => format(parseISO(label), 'MMM d, yyyy')}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        name="Total Calls" 
                        stroke="#8884d8" 
                        activeDot={{ r: 8 }} 
                      />
                      {services.map((service, index) => (
                        <Line
                          key={service}
                          type="monotone"
                          dataKey={`by_service.${service}`}
                          name={service.charAt(0).toUpperCase() + service.slice(1)}
                          stroke={getServiceColor(service, index)}
                          strokeDasharray={index > 0 ? "5 5" : ""}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
