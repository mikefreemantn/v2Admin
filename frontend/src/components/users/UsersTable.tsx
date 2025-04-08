'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Define the user type based on the API response
export interface User {
  user_id: string;
  email: string;
  access_key: string;
  allow_multiple_domains: boolean;
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
  plan_type: string;
  status: string;
  credits: number;
  stripe_customer_id?: string;
}

// Domain usage type definition
interface DomainUsageUser {
  user_id: string;
  email: string;
  access_key: string;
  domains: string[];
  domain_count: number;
  status: string;
  allow_multiple_domains: boolean;
}

interface DomainUsage {
  users: DomainUsageUser[];
  domain_counts: {
    [domain: string]: number;
  };
}

// Props for the UsersTable component
interface UsersTableProps {
  users: User[];
  isLoading: boolean;
  domainUsage?: DomainUsage;
}

export function UsersTable({ users, isLoading, domainUsage }: UsersTableProps) {
  const router = useRouter();
  
  // Function to get styles for different plan types
  const getPlanTypeStyles = (planType: string): string => {
    switch (planType.toLowerCase()) {
      case 'credit_based':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'subscription':
        return 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400';
      case 'free':
        return 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-400';
      case 'enterprise':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400';
    }
  };
  
  // Function to check if a user is misusing the tool (has multiple domains but isn't allowed to)
  const isUserMisusing = (user: User): { misusing: boolean, domainCount: number, domains: string[] } => {
    if (!domainUsage) return { misusing: false, domainCount: 0, domains: [] };
    
    const userDomainInfo = domainUsage.users.find(du => du.user_id === user.user_id);
    
    if (!userDomainInfo) return { misusing: false, domainCount: 0, domains: [] };
    
    // User is misusing if they have multiple domains but aren't allowed to
    const misusing = !user.allow_multiple_domains && userDomainInfo.domains.length > 1;
    
    return {
      misusing,
      domainCount: userDomainInfo.domains.length,
      domains: userDomainInfo.domains
    };
  };
  
  const handleRowClick = (email: string) => {
    // Encode email to make it URL-safe
    const encodedEmail = encodeURIComponent(email);
    router.push(`/dashboard/users/${encodedEmail}`);
  };
  if (isLoading) {
    return (
      <div className="w-full py-10 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-2 text-indigo-600 dark:text-indigo-400">Loading users...</p>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="w-full py-10 text-center">
        <p className="text-slate-600 dark:text-slate-400">No users found.</p>
      </div>
    );
  }

  return (
    <Table className="border border-indigo-100 dark:border-indigo-900/50 rounded-md overflow-hidden">
      <TableCaption className="text-indigo-600 dark:text-indigo-400">A list of all users in the system.</TableCaption>
      <TableHeader className="bg-indigo-50 dark:bg-indigo-950/50">
        <TableRow className="hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30">
          <TableHead className="text-indigo-700 dark:text-indigo-300 font-medium">Email</TableHead>
          <TableHead className="text-indigo-700 dark:text-indigo-300 font-medium">Status</TableHead>
          <TableHead className="text-indigo-700 dark:text-indigo-300 font-medium">Plan Type</TableHead>
          <TableHead className="text-indigo-700 dark:text-indigo-300 font-medium text-right">Credits</TableHead>
          <TableHead className="text-indigo-700 dark:text-indigo-300 font-medium">API Key</TableHead>
          <TableHead className="text-indigo-700 dark:text-indigo-300 font-medium">Multi-Domain</TableHead>
          <TableHead className="text-indigo-700 dark:text-indigo-300 font-medium">Domain Count</TableHead>
          <TableHead className="text-indigo-700 dark:text-indigo-300 font-medium">Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const { misusing, domainCount, domains } = isUserMisusing(user);
          return (
          <TableRow 
            key={user.user_id} 
            onClick={() => handleRowClick(user.email)}
            className={`cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors ${misusing ? 'bg-rose-50 dark:bg-rose-900/20' : ''}`}
          >
            <TableCell className="font-medium text-indigo-600 dark:text-indigo-400">{user.email}</TableCell>
            <TableCell>
              <Badge 
                className={user.status === 'active' 
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-0' 
                  : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white border-0'}
              >
                {user.status}
              </Badge>
            </TableCell>
            <TableCell>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanTypeStyles(user.plan_type)}`}>
                {user.plan_type}
              </span>
            </TableCell>
            <TableCell className="text-right font-medium">
              {(() => {
                // Handle all possible types of credits
                try {
                  let credits = '0';
                  if (user.credits === null || user.credits === undefined) {
                    credits = '0';
                  } else if (typeof user.credits === 'number') {
                    credits = user.credits.toFixed(1);
                  } else if (typeof user.credits === 'string') {
                    const num = parseFloat(user.credits);
                    credits = isNaN(num) ? user.credits : num.toFixed(1);
                  } else {
                    // Fallback for any other type
                    credits = String(user.credits);
                  }
                  
                  // Add color based on credit amount
                  const creditNum = parseFloat(credits);
                  if (creditNum > 500) {
                    return <span className="text-emerald-600 dark:text-emerald-400">{credits}</span>;
                  } else if (creditNum > 100) {
                    return <span className="text-blue-600 dark:text-blue-400">{credits}</span>;
                  } else if (creditNum > 10) {
                    return <span className="text-amber-600 dark:text-amber-400">{credits}</span>;
                  } else {
                    return <span className="text-rose-600 dark:text-rose-400">{credits}</span>;
                  }
                } catch (e) {
                  console.error('Error formatting credits:', e);
                  return <span className="text-rose-600 dark:text-rose-400">0</span>;
                }
              })()}
            </TableCell>
            <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">{user.access_key}</TableCell>
            <TableCell>
              {user.allow_multiple_domains ? (
                <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">Allowed</Badge>
              ) : (
                <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800">Not Allowed</Badge>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <span className={domainCount > 1 ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>
                  {domainCount}
                </span>
                {misusing && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertTriangle className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs bg-white dark:bg-gray-900 border border-rose-200 dark:border-rose-800 shadow-lg">
                        <div>
                          <p className="font-semibold text-rose-600 dark:text-rose-400">Multiple domains detected!</p>
                          <p className="text-sm text-slate-700 dark:text-slate-300">This user is not allowed to have multiple domains but is using {domainCount} domains:</p>
                          <ul className="text-xs mt-1 list-disc pl-4 text-slate-600 dark:text-slate-400">
                            {domains.map((domain, idx) => (
                              <li key={idx}>{domain}</li>
                            ))}
                          </ul>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </TableCell>
            <TableCell className="text-slate-600 dark:text-slate-400">
              {user.created_at 
                ? formatDistanceToNow(new Date(user.created_at * 1000), { addSuffix: true })
                : 'Unknown'}
            </TableCell>
          </TableRow>
        )})}
      </TableBody>
    </Table>
  );
}
