'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  AlertCircle, 
  Loader2, 
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  Users,
  Copy,
  Coins,
  CalendarDays,
  Clock,
  Key,
  AlertTriangle,
  Edit,
  Plus,
  Save,
  X
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { getCurrentUser } from 'aws-amplify/auth';
import { configureAmplifyClient } from '@/lib/amplifyClient';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

// API key for accessing the ReIntent API
const API_KEY = 'ri_9fbcb675c4e1';
const API_BASE_URL = 'https://xwkwzbjifh.execute-api.us-east-2.amazonaws.com/v1';

// Number of items per page for credit history pagination
const ITEMS_PER_PAGE = 10;

// User type definition
interface User {
  user_id: string;
  email: string;
  access_key: string;
  allow_multiple_domains: boolean;
  created_at: number;
  updated_at: number;
  plan_type: string;
  status: string;
  credits: number;
  stripe_customer_id?: string;
}

// Domain usage type definition
interface DomainUsage {
  users: {
    user_id: string;
    email: string;
    access_key: string;
    domains: string[];
    domain_count: number;
    status: string;
    allow_multiple_domains: boolean;
  }[];
  domain_counts: {
    [domain: string]: number;
  };
}

// Credit transaction type definition
interface CreditTransaction {
  service: string;
  user_id: string;
  action_type: string;
  status: string;
  timestamp: number;
  amount: number;
  source_domain: string;
  date: string;
}

export default function UserProfilePage({ params }: { params: Promise<{ email: string }> | { email: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [domainUsage, setDomainUsage] = useState<DomainUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [creditAmount, setCreditAmount] = useState(10);
  const [isAddingCredits, setIsAddingCredits] = useState(false);
  
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
  
  // Edit user state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editedUser, setEditedUser] = useState<Partial<User>>({});
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  
  // Get toast function
  const { toast } = useToast();

  // State for credit history
  const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([]);
  const [isLoadingCreditHistory, setIsLoadingCreditHistory] = useState<boolean>(false);
  
  // State for user notes
  const [userNotes, setUserNotes] = useState<any[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState<boolean>(false);
  const [newNote, setNewNote] = useState<string>('');
  const [isAddingNote, setIsAddingNote] = useState<boolean>(false);
  const [showAddNoteDialog, setShowAddNoteDialog] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalHistoryItems, setTotalHistoryItems] = useState(0);
  const itemsPerPage = ITEMS_PER_PAGE;
  
  // Decode the email from URL using React.use() to unwrap params if it's a Promise
  const emailParam = 'then' in params ? React.use(params as Promise<{ email: string }>) : params;
  const decodedEmail = decodeURIComponent(emailParam.email);
  // Check authentication and fetch user data
  useEffect(() => {
    const checkAuth = async () => {
      try {
        await configureAmplifyClient();
        const currentUser = await getCurrentUser();
        
        // Fetch user data when authentication is successful
        if (decodedEmail) {
          await fetchUserData(decodedEmail);
        }
      } catch (err) {
        console.error('Authentication error:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [decodedEmail, router]);
  
  // Fetch user notes when user data is loaded
  useEffect(() => {
    if (user?.user_id) {
      fetchUserNotes(user.user_id);
    }
  }, [user?.user_id]);
  
  // Fetch user data from API
  const fetchUserData = async (email: string, skipCache = true) => {
    try {
      setLoading(true);
      console.log('Fetching user data for email:', email, 'skipCache:', skipCache);
      
      // Add a timestamp to bust the cache
      const timestamp = new Date().getTime();
      
      // Use proxy endpoint to avoid CORS issues with the correct admin endpoint
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({
          endpoint: `${API_BASE_URL}/admin/users?_=${timestamp}`,
          method: 'GET',
          apiKey: API_KEY,
          skipCache: skipCache // Explicitly tell the proxy to skip cache
        }),
      });
      
      if (!response.ok) {
        console.error('API response not OK:', response.status, response.statusText);
        throw new Error(`Failed to fetch user data: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API response data:', data);
      
      // Find the specific user by email
      let foundUser = null;
      
      // Handle different response formats and find the user with matching email
      if (data.data && data.data.users && Array.isArray(data.data.users)) {
        // Proxy wrapped response
        foundUser = data.data.users.find((user: User) => 
          user.email.toLowerCase() === email.toLowerCase()
        );
        if (foundUser) {
          console.log('User found (proxy format):', foundUser);
        }
      } else if (data.users && Array.isArray(data.users)) {
        // Direct API response
        foundUser = data.users.find((user: User) => 
          user.email.toLowerCase() === email.toLowerCase()
        );
        if (foundUser) {
          console.log('User found (direct format):', foundUser);
        }
      }
      
      if (foundUser) {
        setUser(foundUser);
      } else {
        console.error('User not found in response for email:', email);
        setError(`User not found with email: ${email}`);
      }
      
      // If user was found, fetch their credit history and extract domain usage
      if (foundUser) {
        // Fetch credit history using the found user's ID
        await fetchCreditHistory(foundUser.user_id);
        
        // Extract domain usage from the initial API response
        try {
          console.log('Extracting domain usage for user ID:', foundUser.user_id);
          
          // Check if domain_usage exists in the response
          let domainUsageData = null;
          
          if (data.data && data.data.domain_usage) {
            // Proxy wrapped response
            domainUsageData = data.data.domain_usage;
          } else if (data.domain_usage) {
            // Direct API response
            domainUsageData = data.domain_usage;
          }
          
          if (domainUsageData) {
            console.log('Domain usage data found in initial response:', domainUsageData);
            setDomainUsage(domainUsageData);
          } else {
            console.log('No domain usage data found in initial response, will not display domain information');
          }
        } catch (domainErr) {
          console.error('Error processing domain usage data:', domainErr);
        }
      }
    } catch (err: any) {
      console.error('Error fetching user data:', err);
      setError(`Failed to fetch user data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch credit history from API
  const fetchCreditHistory = async (userId: string) => {
    try {
      setIsLoadingCreditHistory(true);
      console.log('Fetching credit history for user ID:', userId);
      
      // Add a timestamp to bust the cache
      const timestamp = new Date().getTime();
      
      // Use proxy endpoint to avoid CORS issues with the correct admin endpoint
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: `/admin/users/${userId}/credit-history`,
          method: 'GET',
          apiKey: API_KEY,
          skipCache: true // Always skip cache for credit history
        }),
      });
      
      if (!response.ok) {
        console.error('API response not OK:', response.status, response.statusText);
        throw new Error(`Failed to fetch credit history: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('Credit history raw response:', responseData);
      
      // Extract the actual data from the proxy response
      const data = responseData.data || {};
      console.log('Extracted data from proxy response:', data);
      
      // According to the API documentation, the credit history should be in the 'history' field
      let transactions = [];
      
      if (data && Array.isArray(data.history)) {
        console.log('Found history array as documented in API:', data.history);
        transactions = data.history;
      } else if (data && Array.isArray(data.transactions)) {
        console.log('Found transactions array in response:', data.transactions);
        transactions = data.transactions;
      } else if (Array.isArray(data)) {
        console.log('Data is directly an array of transactions:', data);
        transactions = data;
      } else {
        console.error('Could not find transactions array in expected format:', data);
        // Try to find any array in the response
        for (const key in data) {
          if (Array.isArray(data[key])) {
            console.log(`Found array in data.${key}, trying to use it:`, data[key]);
            transactions = data[key];
            break;
          }
        }
      }
      
      console.log('Final extracted transactions:', transactions);
      
      if (transactions && transactions.length > 0) {
        // Process the transactions to add formatted dates
        const processedTransactions = transactions.map((transaction: CreditTransaction) => {
          // Convert timestamp to formatted date
          const date = new Date(transaction.timestamp * 1000);
          return {
            ...transaction,
            date: date.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          };
        });
        
        console.log('Processed transactions:', processedTransactions);
        setCreditHistory(processedTransactions);
        setTotalHistoryItems(processedTransactions.length);
      } else {
        console.warn('No transactions found in response');
        setCreditHistory([]);
        setTotalHistoryItems(0);
      }
    } catch (err: any) {
      console.error('Error fetching credit history:', err);
      setCreditHistory([]);
      setTotalHistoryItems(0);
    } finally {
      setIsLoadingCreditHistory(false);
    }
  };

  // Fetch user notes from localStorage
  const fetchUserNotes = async (userId: string) => {
    try {
      setIsLoadingNotes(true);
      console.log('Fetching notes for user ID:', userId);
      
      // Determine the storage key based on userId
      const storageKey = `chartNotes_user_${userId}`;
      console.log('Using storage key:', storageKey);
      
      // Load saved notes from localStorage with error handling
      let savedNotes;
      let notes = [];
      
      try {
        savedNotes = localStorage.getItem(storageKey);
        notes = savedNotes ? JSON.parse(savedNotes) : [];
        console.log('Loaded notes from localStorage:', notes);
      } catch (parseError) {
        console.error('Error parsing saved notes from localStorage:', parseError);
        notes = [];
        // Try to clean up corrupted data
        localStorage.removeItem(storageKey);
      }
      
      // If no notes exist and this is a development environment, create test notes
      if (notes.length === 0 && window.location.hostname.includes('localhost')) {
        console.log('No notes found, creating test notes for debugging');
        
        // Create a note for today
        const today = new Date();
        const testNote1 = {
          id: 'test_note_1_' + Date.now(),
          date: today.toISOString().split('T')[0],
          content: `Test note for user ${userId} today - Admin`,
          created_at: today.toISOString(),
          user_id: userId
        };
        
        // Create a note for a past date
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 5);
        const testNote2 = {
          id: 'test_note_2_' + Date.now(),
          date: pastDate.toISOString().split('T')[0],
          content: `Previous activity noted for ${userId} - Admin`,
          created_at: pastDate.toISOString(),
          user_id: userId
        };
        
        notes.push(testNote1, testNote2);
        localStorage.setItem(storageKey, JSON.stringify(notes));
        console.log('Created test notes:', notes);
      }
      
      // Process notes to add formatted dates
      const processedNotes = notes.map((note: any) => {
        // Convert created_at timestamp to formatted date if it exists
        let formattedDate = '';
        if (note.created_at) {
          const date = new Date(note.created_at);
          formattedDate = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
        
        return {
          ...note,
          formatted_date: formattedDate || note.date
        };
      });
      
      // Sort notes by created_at timestamp in descending order (newest first)
      processedNotes.sort((a: any, b: any) => {
        const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
        const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log('Processed and sorted notes:', processedNotes);
      setUserNotes(processedNotes);
    } catch (err: any) {
      console.error('Error fetching user notes:', err);
      setUserNotes([]);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  // Since we're in April 2025, we're in Daylight Saving Time (CDT)
  // CDT is UTC-5 hours
  const centralTimeOffset = -5;
  const timezoneName = 'CDT';
  
  // Format timestamp to readable date in Central Time (CDT/CST)
  const formatTimestamp = (timestamp: number) => {
    try {
      // Create a date from the timestamp (which is in seconds)
      // The timestamp is in UTC/GMT
      const utcDate = new Date(timestamp * 1000);
      
      // Apply the Central Time offset (either -5 for CDT or -6 for CST)
      const centralDate = new Date(utcDate.getTime() + (centralTimeOffset * 60 * 60 * 1000));
      
      // Format the date with the correct timezone abbreviation
      return format(centralDate, 'MMM d, yyyy h:mm a') + ' ' + timezoneName;
    } catch (err) {
      console.error('Error formatting timestamp:', err);
      return 'Invalid date';
    }
  };
  
  // Format ISO date string to Central Time
  const formatIsoDate = (isoDateString: string) => {
    try {
      // Parse the ISO date string (which is in UTC/GMT)
      const utcDate = new Date(isoDateString);
      
      // Adjust for Central Time
      const centralDate = new Date(utcDate.getTime() + centralTimeOffset * 60 * 60 * 1000);
      
      // Format the date with the correct timezone abbreviation
      return format(centralDate, 'MMM d, yyyy h:mm a') + ' ' + timezoneName;
    } catch (err) {
      console.error('Error formatting ISO date:', err);
      return 'Invalid date';
    }
  };

  // Handle adding credits to user using webhook approach
  const handleAddCredits = async () => {
    if (!user || !creditAmount) return;
    
    try {
      setIsAddingCredits(true);
      console.log('Adding credits via webhook:', creditAmount);
      
      // Use the webhook endpoint to handle both updating the user and recording the transaction
      const webhookResponse = await fetch('/api/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add_credits',
          userId: user.user_id,
          data: {
            amount: creditAmount,
            currentCredits: user.credits,
            apiKey: user.access_key, // Pass the user's API key
            service: 'admin',
            sourceDomain: 'admin.dashboard',
            description: 'Credits added by admin'
          }
        }),
      });
      
      const webhookResult = await webhookResponse.json();
      console.log('Webhook response:', webhookResult);
      
      if (!webhookResponse.ok) {
        console.error('Webhook response not OK:', webhookResponse.status, webhookResponse.statusText);
        console.error('Webhook error details:', webhookResult);
        throw new Error(`Failed to add credits: ${webhookResult.error || webhookResponse.status}`);
      }
      
      // Update user state with new credits from the webhook response
      if (webhookResult.updatedCredits) {
        setUser({
          ...user,
          credits: webhookResult.updatedCredits
        });
      } else {
        // Fallback if webhook doesn't return updated credits
        setUser({
          ...user,
          credits: user.credits + creditAmount
        });
      }
      
      // Show success message
      toast({
        title: "Credits Added",
        description: `${creditAmount} credits have been added to the user's account`
      });
      
      // Close dialog and reset credit amount
      setShowCreditDialog(false);
      setCreditAmount(10);
      
      // Refresh credit history
      await fetchCreditHistory(user.user_id);
      
      // Refresh user data to ensure we have the latest information
      await fetchUserData(user.email, true);
      
    } catch (err: any) {
      console.error('Error adding credits:', err);
      setError(`Failed to add credits: ${err.message}`);
      toast({
        title: "Error",
        description: `Failed to add credits: ${err.message}`
      });
    } finally {
      setIsAddingCredits(false);
    }
  };

  // Handle adding a new note
  const handleAddNote = async () => {
    if (!user || !newNote.trim()) return;
    
    setIsAddingNote(true);
    
    try {
      // Get current admin user's name (for this example, hardcoding "Mike Freeman")
      const adminName = "Mike Freeman";
      
      // Create a note with the admin's name appended
      const noteWithSignature = `${newNote.trim()} - ${adminName}`;
      
      console.log(`Adding new note for user ${user.email}: ${noteWithSignature}`);
      
      // Determine the storage key based on userId
      const storageKey = `chartNotes_user_${user.user_id}`;
      console.log('Using storage key for saving note:', storageKey);
      
      // Load existing notes from localStorage
      const savedNotes = localStorage.getItem(storageKey);
      let existingNotes = savedNotes ? JSON.parse(savedNotes) : [];
      
      // Create a new note object
      const newNoteData = {
        id: `note_${Date.now()}`,
        title: `Note for ${user.email}`,
        content: noteWithSignature,
        date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
        context: 'user',
        user_id: user.user_id,
        created_at: new Date().toISOString()
      };
      
      console.log('Created new note:', newNoteData);
      
      // Add the new note to the existing notes
      existingNotes.push(newNoteData);
      
      // Save the updated notes to localStorage
      localStorage.setItem(storageKey, JSON.stringify(existingNotes));
      console.log('Saved notes to localStorage:', existingNotes);
      
      // Format the date for display
      const formattedNote = {
        ...newNoteData,
        formatted_date: new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };
      
      console.log('Adding formatted note to state:', formattedNote);
      
      // Add the new note to the state
      setUserNotes(prev => [formattedNote, ...prev]);
      
      // Clear the input field
      setNewNote('');
      
      // Close the dialog
      setIsAddingNote(false);
      
      toast({
        title: "Note added",
        description: `A new note has been added for ${user.email}.`,
        variant: "default",
      });
    } catch (err: any) {
      console.error('Error adding note:', err);
      toast({
        title: "Failed to add note",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsAddingNote(false);
    }
  };
  
  // Handle deleting a note
  const handleDeleteNote = (noteId: string) => {
    if (!user) return;
    
    try {
      // Determine the storage key based on userId
      const storageKey = `chartNotes_user_${user.user_id}`;
      console.log(`Deleting note ${noteId} using storage key:`, storageKey);
      
      // Load existing notes from localStorage
      const savedNotes = localStorage.getItem(storageKey);
      let existingNotes = savedNotes ? JSON.parse(savedNotes) : [];
      
      // Filter out the note to delete
      const updatedNotes = existingNotes.filter((note: any) => note.id !== noteId);
      
      // Save the updated notes to localStorage
      localStorage.setItem(storageKey, JSON.stringify(updatedNotes));
      console.log('Updated notes after deletion:', updatedNotes);
      
      // Update the state
      setUserNotes((prev: any[]) => prev.filter(note => note.id !== noteId));
      
      toast({
        title: "Note deleted",
        description: `The note has been deleted from ${user.email}'s profile.`,
        variant: "default",
      });
    } catch (err: any) {
      console.error('Error deleting note:', err);
      toast({
        title: "Failed to delete note",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  // Handle toggling user status (active/inactive)
  const handleToggleStatus = async () => {
    if (!user) return;
    
    try {
      // Create the new status
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      
      // Include ALL required fields from the current user object
      const updateData = {
        status: newStatus,
        credits: user.credits,
        plan_type: user.plan_type,
        allow_multiple_domains: user.allow_multiple_domains
      };
      
      console.log('Toggling user status to:', newStatus, 'with complete payload:', updateData);
      
      // Use the proxy endpoint with the correct format and complete data
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: `/admin/users/${user.user_id}`,
          method: 'PUT',
          apiKey: API_KEY,
          data: updateData,
          skipCache: true
        }),
      });
      
      const responseBody = await response.json();
      console.log('Full proxy response:', responseBody);
      
      // The proxy returns a wrapper object with status, statusText, and data properties
      if (responseBody.status !== 200) {
        console.error('API response not OK:', responseBody.status, responseBody.data);
        throw new Error(`API request failed with status ${responseBody.status}: ${JSON.stringify(responseBody.data)}`);
      }
      
      // Update local user state with the new status
      setUser(prev => prev ? { ...prev, status: newStatus } : null);
      
      toast({
        title: "Status updated",
        description: `User has been ${newStatus === 'active' ? 'activated' : 'deactivated'}.`,
        variant: "default",
      });
      
      // Refresh user data to ensure we have the latest information
      await fetchUserData(decodedEmail, true);
      
    } catch (err: any) {
      console.error('Error updating user status:', err);
      setError(`Failed to update status: ${err.message}`);
      
      toast({
        title: "Failed to update status",
        description: err.message || "There was an error updating the user's status.",
        variant: "destructive",
      });
    }
  };

  // Handle deleting user
  const handleDeleteUser = async () => {
    if (!user) return;
    
    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete ${user.email}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: `${API_BASE_URL}/admin/users/${user.user_id}/delete`,
          method: 'DELETE',
          apiKey: API_KEY
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete user: ${response.status}`);
      }
      
      // Redirect to users list
      router.push('/dashboard/users');
      
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(`Failed to delete user: ${err.message}`);
    }
  };

  // Handle credit amount change
  const handleCreditAmountChange = (value: number) => {
    setCreditAmount(Math.max(0, value));
  };
  
  // Initialize edit form with current user data
  const initializeEditForm = () => {
    if (user) {
      setEditedUser({
        status: user.status,
        credits: user.credits,
        plan_type: user.plan_type,
        allow_multiple_domains: user.allow_multiple_domains
      });
    }
    setShowEditDialog(true);
  };
  
  // Handle form field changes
  const handleEditFormChange = (field: keyof User, value: string | number | boolean) => {
    setEditedUser(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Update user data
  const handleUpdateUser = async () => {
    if (!user) return;
    
    setIsUpdatingUser(true);
    
    try {
      console.log('Updating user with data:', editedUser);
      
      // Use the proxy endpoint to avoid CORS issues
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: `/admin/users/${user.user_id}`,
          method: 'PUT',
          apiKey: API_KEY,
          data: editedUser,
          skipCache: true // Ensure we're not using cached data
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('API response not OK:', response.status, data);
        throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(data)}`);
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      console.log('User update response:', data);
      
      // Update local user state with the edited values
      setUser(prev => prev ? { ...prev, ...editedUser } : null);
      
      toast({
        title: "User updated successfully",
        description: "The user's information has been updated.",
        variant: "default",
      });
      
      // Refresh user data to ensure we have the latest information
      await fetchUserData(decodedEmail);
      
      setShowEditDialog(false);
    } catch (err: any) {
      console.error('Error updating user:', err);
      toast({
        title: "Failed to update user",
        description: err.message || "There was an error updating the user's information.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingUser(false);
    }
  };

  // Handle back button click
  const handleBackClick = () => {
    router.push('/dashboard');
  };

  // Render function
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex justify-between items-center">
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4 text-indigo-400 dark:text-indigo-600" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">Users</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4 text-indigo-400 dark:text-indigo-600" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-slate-600 dark:text-slate-400">{decodedEmail}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Button variant="outline" size="sm" onClick={handleBackClick} className="flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Button>
      </div>

      {/* Loading and Error States */}
      {loading ? (
        <Card className="border-0 shadow-md bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950 dark:to-gray-900 overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600 dark:text-indigo-400 mb-4" />
            <p className="text-indigo-600 dark:text-indigo-400">Loading user data...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-0 shadow-md bg-gradient-to-br from-rose-50 to-white dark:from-rose-950 dark:to-gray-900 overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <AlertCircle className="h-12 w-12 text-rose-600 dark:text-rose-400 mb-4" />
            <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400 mb-2">Error Loading User</h3>
            <p className="text-rose-600 dark:text-rose-400">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* User Profile Card */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950 dark:to-gray-900 overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                {/* User Info - 1/3 width */}
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">User Profile</h2>
                    <p className="text-indigo-600 dark:text-indigo-400">User details and account information</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex flex-col space-y-1">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">Email</Label>
                      <div className="flex items-center">
                        <span className="font-medium">{user?.email}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 ml-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                          onClick={() => {
                            navigator.clipboard.writeText(user?.email || '');
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-1">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">User ID</Label>
                      <div className="flex items-center">
                        <span className="font-medium text-indigo-700 dark:text-indigo-300">{user?.user_id}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 ml-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                          onClick={() => {
                            navigator.clipboard.writeText(user?.user_id || '');
                            toast({
                              title: "Copied to clipboard",
                              description: "User ID has been copied to clipboard",
                            });
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-1">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">API Key</Label>
                      <div className="flex items-center">
                        <span className="font-medium text-blue-700 dark:text-blue-300 font-mono">{user?.access_key}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 ml-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          onClick={() => {
                            navigator.clipboard.writeText(user?.access_key || '');
                            toast({
                              title: "Copied to clipboard",
                              description: "API Key has been copied to clipboard",
                            });
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-1">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">Status</Label>
                      <div className="flex items-center">
                        <Badge 
                          className={`capitalize ${user?.status === 'active' 
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                            : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'}`}
                        >
                          {user?.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-1">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">Plan Type</Label>
                      <div className="flex items-center">
                        <Badge variant="outline" className={`capitalize ${getPlanTypeStyles(user?.plan_type || '')}`}>
                          {user?.plan_type || 'No plan'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-1">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">Credits</Label>
                      <div className="flex items-center">
                        <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                          <Coins className="mr-1 h-3 w-3" />
                          {user?.credits.toFixed(2)}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-1">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">Created</Label>
                      <div className="flex items-center text-sm text-slate-700 dark:text-slate-300">
                        <CalendarDays className="mr-1 h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        {user?.created_at ? formatTimestamp(user.created_at) : 'Unknown'}
                      </div>
                    </div>

                    <div className="flex flex-col space-y-1">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">Last Updated</Label>
                      <div className="flex items-center text-sm text-slate-700 dark:text-slate-300">
                        <Clock className="mr-1 h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                        {user?.updated_at ? formatTimestamp(user.updated_at) : 'Unknown'}
                      </div>
                    </div>

                    <div className="flex flex-col space-y-1">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">Multiple Domains</Label>
                      <div className="flex items-center">
                        <Badge 
                          className={`capitalize ${user?.allow_multiple_domains 
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                            : 'bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-800'}`}
                        >
                          {user?.allow_multiple_domains ? 'Allowed' : 'Not Allowed'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right column - 2/3 width with stacked sections */}
                <div className="md:col-span-2 space-y-6">
                  {/* User Actions with Edit User button to the right */}
                  <div>
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-600 to-orange-600 dark:from-rose-400 dark:to-orange-400">User Actions</h2>
                        <p className="text-rose-600 dark:text-rose-400">Manage this user account</p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="flex items-center justify-center bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-950 dark:to-gray-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:shadow-md transition-all duration-200" 
                        onClick={initializeEditForm}
                      >
                        <Edit className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        Edit User
                      </Button>
                    </div>
                  </div>

                  {/* Horizontal action buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {showCreditDialog ? (
                      <div className="md:col-span-3 p-4 border rounded-md bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950 dark:to-gray-900 border-emerald-200 dark:border-emerald-800 shadow-md">
                        <h3 className="font-medium mb-2 text-emerald-700 dark:text-emerald-400">Add Credits</h3>
                        <div className="flex items-center mb-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setCreditAmount(Math.max(0, creditAmount - 10))}
                          >
                            -10
                          </Button>
                          <input 
                            type="number" 
                            value={creditAmount}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCreditAmountChange(parseInt(e.target.value) || 0)}
                            className="mx-2 p-2 w-20 text-center border rounded-md border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            min="0"
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setCreditAmount(creditAmount + 10)}
                          >
                            +10
                          </Button>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            onClick={handleAddCredits} 
                            disabled={isAddingCredits}
                            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 dark:from-emerald-600 dark:to-green-600 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                          >
                            {isAddingCredits ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              'Confirm'
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setShowCreditDialog(false)}
                            disabled={isAddingCredits}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button 
                        onClick={() => setShowCreditDialog(true)}
                        disabled={isAddingCredits}
                        className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 dark:from-emerald-600 dark:to-green-600 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        {isAddingCredits ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>Add Credits</>
                        )}
                      </Button>
                    )}

                    <Button 
                      onClick={handleToggleStatus}
                      disabled={isAddingCredits}
                      variant={user?.status === 'active' ? 'destructive' : 'default'}
                    >
                      {user?.status === 'active' ? 'Deactivate User' : 'Activate User'}
                    </Button>

                    <Button 
                      onClick={handleDeleteUser}
                      disabled={isAddingCredits}
                      variant="destructive"
                      className="bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 border-0 shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      Delete User
                    </Button>
                  </div>
                  
                  {/* User Notes Section - Below User Actions */}
                  <div className="space-y-4 mt-6">
                    <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400">User Notes</h2>
                      <p className="text-purple-600 dark:text-purple-400">Admin notes about this user</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-gradient-to-r from-purple-50 to-white dark:from-purple-950 dark:to-gray-900 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:shadow-md transition-all duration-200"
                      onClick={() => setShowAddNoteDialog(true)}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add Note
                    </Button>
                  </div>

                  <div className="space-y-4 mt-4">
                    {isLoadingNotes ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : userNotes.length > 0 ? (
                      <div className="space-y-3">
                        {userNotes.map((note) => (
                          <div key={note.id} className="p-3 rounded-md border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
                            <div className="flex justify-between items-start mb-1">
                              <div className="font-medium text-purple-700 dark:text-purple-400">{note.title}</div>
                              <div className="flex items-center space-x-2">
                                <div className="text-xs text-slate-500 dark:text-slate-400">{note.formatted_date}</div>
                                <button 
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
                                  title="Delete note"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{note.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic">No notes available for this user</p>
                    )}
                  </div>
                </div>

                  {/* Domain Usage Section - Below User Notes */}
                  <div className="space-y-4 mt-6">
                    <div>
                      <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400">Domain Usage</h2>
                      <p className="text-blue-600 dark:text-blue-400">Domains associated with this user</p>
                    </div>

                    <div className="mt-4">
                      {domainUsage ? (
                        <div className="space-y-4">
                          {/* Find the current user in the domain usage data */}
                          {(() => {
                            // Find the user entry that matches the current user ID
                            const currentUserDomains = domainUsage.users?.find(u => u.user_id === user?.user_id)?.domains || [];
                            
                            if (currentUserDomains.length > 0) {
                              return (
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-600 dark:text-slate-400">Registered Domains</Label>
                                  <div className="flex flex-wrap gap-2">
                                    {currentUserDomains.map((domain, index) => (
                                      <Badge key={index} variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                                        {domain}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              );
                            } else {
                              return <p className="text-muted-foreground italic">No domains registered for this user</p>;
                            }
                          })()}
                        </div>
                      ) : (
                        <p className="text-muted-foreground italic">No domain usage information available</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Credit History Card */}
          <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950 dark:to-gray-900">
            <CardHeader>
              <CardTitle className="text-indigo-900 dark:text-indigo-300 text-2xl font-bold">Credit History</CardTitle>
              <CardDescription className="text-indigo-600 dark:text-indigo-400">
                Transaction history for this user
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCreditHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                </div>
              ) : creditHistory && creditHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Source Domain</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creditHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No credit history found
                          </TableCell>
                        </TableRow>
                      ) : (
                        creditHistory
                          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                          .map((transaction, index) => (
                            <TableRow key={index}>
                              <TableCell>{transaction.date ? formatIsoDate(transaction.date) : formatTimestamp(transaction.timestamp)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {transaction.service}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={transaction.action_type === 'credit_addition' ? 'default' : 'destructive'}
                                  className={transaction.action_type === 'credit_addition' ? 'bg-green-500 hover:bg-green-600' : ''}
                                >
                                  {transaction.action_type === 'credit_addition' ? '+' : '-'}{Math.abs(transaction.amount)}
                                </Badge>
                              </TableCell>
                              <TableCell className="capitalize">{transaction.status || 'Unknown'}</TableCell>
                              <TableCell className="text-xs">{transaction.source_domain || 'N/A'}</TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                  
                  {/* Pagination Controls */}
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {Math.max(1, Math.ceil(creditHistory.length / itemsPerPage))}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => p + 1)}
                      disabled={currentPage >= Math.ceil(creditHistory.length / itemsPerPage)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
        ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No credit history found for this user
                </div>
          )}
            </CardContent>
          </Card>
          
          {/* Edit User Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Update the user's account information and settings.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    Status
                  </Label>
                  <div className="col-span-3">
                    <Select 
                      value={editedUser.status} 
                      onValueChange={(value) => handleEditFormChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="credits" className="text-right">
                    Credits
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="credits"
                      type="number"
                      value={editedUser.credits}
                      onChange={(e) => handleEditFormChange('credits', Number(e.target.value))}
                      min="0"
                      step="1"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="plan_type" className="text-right">
                    Plan Type
                  </Label>
                  <div className="col-span-3">
                    <Select 
                      value={editedUser.plan_type} 
                      onValueChange={(value) => handleEditFormChange('plan_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select plan type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="credit_based">Credit Based</SelectItem>
                        <SelectItem value="subscription">Subscription</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="allow_multiple_domains" className="text-right">
                    Multiple Domains
                  </Label>
                  <div className="col-span-3 flex items-center space-x-2">
                    <Switch
                      id="allow_multiple_domains"
                      checked={editedUser.allow_multiple_domains}
                      onCheckedChange={(checked: boolean) => handleEditFormChange('allow_multiple_domains', checked)}
                    />
                    <Label htmlFor="allow_multiple_domains" className="text-sm text-muted-foreground">
                      Allow user to register multiple domains
                    </Label>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button onClick={() => setShowEditDialog(false)} variant="outline" disabled={isUpdatingUser}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateUser} disabled={isUpdatingUser}>
                  {isUpdatingUser ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Add Note Dialog */}
          <Dialog open={showAddNoteDialog} onOpenChange={setShowAddNoteDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Note</DialogTitle>
                <DialogDescription>
                  Add a new note for this user. Your name will be automatically added to the end of the note.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="note-content">Note Content</Label>
                  <Textarea
                    id="note-content"
                    placeholder="Enter your note here..."
                    value={newNote}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewNote(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddNoteDialog(false)} disabled={isAddingNote}>
                  Cancel
                </Button>
                <Button type="submit" onClick={handleAddNote} disabled={isAddingNote || !newNote.trim()}>
                  {isAddingNote ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Note'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
