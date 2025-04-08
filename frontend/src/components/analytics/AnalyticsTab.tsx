'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Sparkles, Users, Trophy } from 'lucide-react';
import { AnalyticsOverview } from './AnalyticsOverview';
import { UserAnalytics } from './UserAnalytics';
import { TopUsersCard } from './TopUsersCard';
import { PremiumAnalyticsDashboard } from './PremiumAnalyticsDashboard';

export function AnalyticsTab() {
  const [activeTab, setActiveTab] = useState<string>('premium');

  return (
    <div className="space-y-6">
      <Tabs defaultValue="premium" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gradient-to-r from-indigo-100 to-violet-100 dark:from-indigo-900/40 dark:to-violet-900/40 border border-indigo-200 dark:border-indigo-800">
          <TabsTrigger 
            value="premium" 
            className="flex items-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white"
          >
            <Sparkles className="h-4 w-4" />
            Premium Dashboard
          </TabsTrigger>
          <TabsTrigger 
            value="overview" 
            className="flex items-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white"
          >
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="users" 
            className="flex items-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white"
          >
            <Users className="h-4 w-4" />
            User Analytics
          </TabsTrigger>
          <TabsTrigger 
            value="top-users" 
            className="flex items-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white"
          >
            <Trophy className="h-4 w-4" />
            Top Users
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="premium" className="mt-6">
          <PremiumAnalyticsDashboard />
        </TabsContent>
        
        <TabsContent value="overview" className="mt-6">
          <div className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950 dark:to-gray-900 rounded-lg p-6">
            <h2 className="text-2xl font-bold tracking-tight text-indigo-900 dark:text-indigo-300 mb-4">Analytics Overview</h2>
            <AnalyticsOverview />
          </div>
          <div className="mt-6 overflow-hidden border-0 shadow-xl bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950 dark:to-gray-900 rounded-lg p-6">
            <h2 className="text-2xl font-bold tracking-tight text-indigo-900 dark:text-indigo-300 mb-4">Top Performing Users</h2>
            <TopUsersCard />
          </div>
        </TabsContent>
        
        <TabsContent value="users" className="mt-6">
          <div className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950 dark:to-gray-900 rounded-lg p-6">
            <h2 className="text-2xl font-bold tracking-tight text-indigo-900 dark:text-indigo-300 mb-4">User Analytics</h2>
            <UserAnalytics />
          </div>
        </TabsContent>
        
        <TabsContent value="top-users" className="mt-6">
          <div className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950 dark:to-gray-900 rounded-lg p-6">
            <h2 className="text-2xl font-bold tracking-tight text-indigo-900 dark:text-indigo-300 mb-4">Top Performing Users</h2>
            <TopUsersCard />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
