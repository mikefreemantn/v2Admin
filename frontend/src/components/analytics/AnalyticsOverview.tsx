'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { BarChart3, LineChart as LineChartIcon, Calendar, RefreshCw } from 'lucide-react';

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

export function AnalyticsOverview() {
  const [apiUsage, setApiUsage] = useState<ApiUsageData[]>([]);
  const [totalCalls, setTotalCalls] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<string>('30days'); // '7days', '30days', '90days'
  const [chartType, setChartType] = useState<string>('line'); // 'line', 'bar'
  
  const { toast } = useToast();

  // Fetch API usage data
  const fetchApiUsage = async () => {
    setIsLoading(true);
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
      
      setApiUsage(sortedData);
      setTotalCalls(apiData.total_calls);
    } catch (err: any) {
      console.error('Error fetching API usage data:', err);
      setError(err.message || 'Failed to load API usage data');
      toast({
        title: 'Error',
        description: err.message || 'Failed to load API usage data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load API usage data when component mounts
  useEffect(() => {
    fetchApiUsage();
  }, []);

  // Filter data based on selected date range
  const getFilteredData = () => {
    if (!apiUsage.length) return [];
    
    const today = new Date();
    let daysToSubtract = 30;
    
    if (dateRange === '7days') {
      daysToSubtract = 7;
    } else if (dateRange === '90days') {
      daysToSubtract = 90;
    }
    
    const startDate = subDays(today, daysToSubtract);
    
    return apiUsage.filter(item => {
      const itemDate = parseISO(item.date);
      return itemDate >= startDate;
    });
  };

  // Get services from the data
  const getServices = () => {
    const services = new Set<string>();
    
    apiUsage.forEach(item => {
      Object.keys(item.by_service).forEach(service => {
        services.add(service);
      });
    });
    
    return Array.from(services);
  };

  // Get colors for services
  const getServiceColor = (service: string, index: number) => {
    // Use the premium dashboard color palette
    const CHART_COLORS = [
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
    
    // Map specific services to specific colors for consistency
    if (service === 'chatgpt') return '#10b981'; // emerald
    if (service === 'firecrawl') return '#f97316'; // orange
    if (service === 'dalle') return '#8b5cf6'; // violet
    if (service === 'whisper') return '#f59e0b'; // amber
    if (service === 'embeddings') return '#3b82f6'; // blue
    if (service === 'claude') return '#6366f1'; // indigo
    if (service === 'mistral') return '#f43f5e'; // rose
    if (service === 'llama') return '#06b6d4'; // cyan
    
    return CHART_COLORS[index % CHART_COLORS.length];
  };
  
  // Get service display name
  const getServiceDisplayName = (service: string) => {
    const serviceNames: Record<string, string> = {
      'chatgpt': 'ChatGPT',
      'firecrawl': 'FireCrawl',
      'dalle': 'DALL-E',
      'whisper': 'Whisper',
      'embeddings': 'Embeddings',
      'claude': 'Claude',
      'mistral': 'Mistral',
      'llama': 'Llama'
    };
    
    return serviceNames[service] || service.charAt(0).toUpperCase() + service.slice(1);
  };

  const filteredData = getFilteredData();
  const services = getServices();

  // Calculate service totals
  const calculateServiceTotals = () => {
    const totals: { [key: string]: number } = {};
    
    services.forEach(service => {
      totals[service] = 0;
    });
    
    filteredData.forEach(item => {
      services.forEach(service => {
        if (item.by_service[service]) {
          totals[service] += item.by_service[service];
        }
      });
    });
    
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  };

  const serviceTotals = calculateServiceTotals();

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d');
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">API Usage Analytics</h2>
          <p className="text-indigo-600 dark:text-indigo-400">Monitor API usage across all services</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Tabs defaultValue="30days" value={dateRange} onValueChange={setDateRange} className="w-auto">
            <TabsList className="bg-gradient-to-r from-indigo-100 to-violet-100 dark:from-indigo-900/40 dark:to-violet-900/40 border border-indigo-200 dark:border-indigo-800">
              <TabsTrigger value="7days" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white">7 Days</TabsTrigger>
              <TabsTrigger value="30days" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white">30 Days</TabsTrigger>
              <TabsTrigger value="90days" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white">90 Days</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Tabs defaultValue="line" value={chartType} onValueChange={setChartType} className="w-auto">
            <TabsList className="bg-gradient-to-r from-indigo-100 to-violet-100 dark:from-indigo-900/40 dark:to-violet-900/40 border border-indigo-200 dark:border-indigo-800">
              <TabsTrigger value="line" className="flex items-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white">
                <LineChartIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Line</span>
              </TabsTrigger>
              <TabsTrigger value="bar" className="flex items-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Bar</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchApiUsage} 
            disabled={isLoading}
            className="flex items-center gap-1 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:bg-indigo-950/50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''} text-indigo-600 dark:text-indigo-400`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950 dark:to-gray-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Total API Calls</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24 bg-indigo-200 dark:bg-indigo-800" />
            ) : (
              <div className="text-3xl font-bold text-indigo-900 dark:text-indigo-300">{totalCalls.toLocaleString()}</div>
            )}
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-violet-50 to-white dark:from-violet-950 dark:to-gray-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-violet-600 dark:text-violet-400">Calls in Selected Period</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24 bg-violet-200 dark:bg-violet-800" />
            ) : (
              <div className="text-3xl font-bold text-violet-900 dark:text-violet-300">
                {filteredData.reduce((sum, item) => sum + item.count, 0).toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">Daily Average</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24 bg-blue-200 dark:bg-blue-800" />
            ) : (
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-300">
                {filteredData.length > 0
                  ? Math.round(
                      filteredData.reduce((sum, item) => sum + item.count, 0) / filteredData.length
                    ).toLocaleString()
                  : '0'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Main Chart */}
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950 dark:to-gray-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold text-indigo-900 dark:text-indigo-300">API Usage Over Time</CardTitle>
          <CardDescription className="text-indigo-600 dark:text-indigo-400">
            Daily API calls across all services for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="w-full h-[400px] flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent align-[-0.125em]"></div>
                <p className="mt-2 text-sm text-indigo-600 dark:text-indigo-400">Loading chart data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="w-full h-[400px] flex items-center justify-center">
              <div className="text-center text-destructive">
                <p>{error}</p>
                <Button variant="outline" onClick={fetchApiUsage} className="mt-4">
                  Try Again
                </Button>
              </div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="w-full h-[400px] flex items-center justify-center">
              <p className="text-muted-foreground">No data available for the selected period</p>
            </div>
          ) : (
            <div className="w-full h-[400px] px-4 pt-4 pb-6">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'line' ? (
                  <LineChart data={filteredData}>
                    <defs>
                      {services.map((service, index) => (
                        <linearGradient key={`gradient-${service}`} id={`color-${service}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={getServiceColor(service, index)} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={getServiceColor(service, index)} stopOpacity={0.1}/>
                        </linearGradient>
                      ))}
                      <linearGradient id="color-total" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
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
                      formatter={(value, name) => [`${value.toLocaleString()} calls`, name]}
                      labelFormatter={(label) => format(parseISO(label), 'MMM d, yyyy')}
                      contentStyle={{ 
                        borderRadius: '8px', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        border: 'none',
                        padding: '10px 14px'
                      }}
                      cursor={{ stroke: '#8884d8', strokeWidth: 1, strokeDasharray: '5 5' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36} 
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ paddingTop: '10px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      name="Total Calls" 
                      stroke="#8884d8" 
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 8, strokeWidth: 0 }} 
                      isAnimationActive={true}
                      animationDuration={1500}
                    />
                    {services.map((service, index) => (
                      <Line
                        key={service}
                        type="monotone"
                        dataKey={`by_service.${service}`}
                        name={getServiceDisplayName(service)}
                        stroke={getServiceColor(service, index)}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        isAnimationActive={true}
                        animationDuration={1500}
                        animationEasing="ease-in-out"
                      />
                    ))}
                  </LineChart>
                ) : (
                  <BarChart data={filteredData}>
                    <defs>
                      {services.map((service, index) => (
                        <linearGradient key={`gradient-${service}`} id={`bar-color-${service}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={getServiceColor(service, index)} stopOpacity={1}/>
                          <stop offset="100%" stopColor={getServiceColor(service, index)} stopOpacity={0.7}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
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
                      formatter={(value, name) => [`${value.toLocaleString()} calls`, name]}
                      labelFormatter={(label) => format(parseISO(label), 'MMM d, yyyy')}
                      contentStyle={{ 
                        borderRadius: '8px', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        border: 'none',
                        padding: '10px 14px'
                      }}
                      cursor={{ fill: 'rgba(136, 132, 216, 0.1)' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36} 
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ paddingTop: '10px' }}
                    />
                    {services.map((service, index) => (
                      <Bar
                        key={service}
                        dataKey={`by_service.${service}`}
                        name={getServiceDisplayName(service)}
                        stackId="a"
                        fill={`url(#bar-color-${service})`}
                        radius={[4, 4, 0, 0]}
                        isAnimationActive={true}
                        animationDuration={1500}
                        animationEasing="ease-in-out"
                      />
                    ))}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Service Breakdown */}
      <Card className="border-0 bg-gradient-to-br from-background via-background to-background/80 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold">Service Breakdown</CardTitle>
          <CardDescription className="text-muted-foreground">
            Distribution of API calls by service
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="w-full h-[300px] flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em]"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading chart data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="w-full h-[300px] flex items-center justify-center">
              <div className="text-center text-destructive">
                <p>{error}</p>
              </div>
            </div>
          ) : serviceTotals.length === 0 ? (
            <div className="w-full h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground">No service data available</p>
            </div>
          ) : (
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={serviceTotals}
                  margin={{ top: 20, right: 30, left: 70, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => getServiceDisplayName(value)}
                  />
                  <Tooltip 
                    formatter={(value, name, props) => [`${value.toLocaleString()} calls`, getServiceDisplayName(props.payload.name)]}
                    contentStyle={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar 
                    dataKey="value" 
                    name="Calls" 
                    fill="#8884d8" 
                    radius={[0, 4, 4, 0]}
                  >
                    {serviceTotals.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getServiceColor(entry.name, index)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Missing Cell component from recharts
const Cell = ({ fill, ...props }: any) => {
  return <rect {...props} fill={fill} />;
};
