'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { configureAmplifyClient } from '@/lib/amplifyClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UsersTable, User } from '@/components/users/UsersTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, X, UserPlus, Loader2, BarChart3 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { AnalyticsTab } from '@/components/analytics/AnalyticsTab';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

// Use our proxy API route instead of direct API calls
const API_PROXY_URL = '/api/proxy';

export default function DashboardPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [domainUsage, setDomainUsage] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Create user state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    initial_credits: 100,
    plan_type: 'credit_based'
  });
  
  // Toast notifications
  const { toast } = useToast();

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Ensure Amplify is configured
        configureAmplifyClient();
        
        const user = await getCurrentUser();
        setUsername(user.username);
        setIsLoading(false);
      } catch (error) {
        console.error('Not authenticated, redirecting to login', error);
        router.replace('/login');
      }
    };

    checkAuth();
  }, [router]);

  // Fetch users data using the proxy API route
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    setError(null);
    
    try {
      // Add a cache-busting parameter to ensure fresh data
      const timestamp = new Date().getTime();
      const response = await fetch(`${API_PROXY_URL}?_t=${timestamp}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: '/admin/users',
          method: 'GET'
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const responseBody = await response.json();
      const data = responseBody.data; // The actual API response is in the data property
      const usersList = data?.users || [];
      setUsers(usersList);
      setFilteredUsers(usersList);
      
      // Store domain usage data
      if (data?.domain_usage) {
        setDomainUsage(data.domain_usage);
        console.log('Domain usage data loaded:', data.domain_usage);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again later.');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Load users when the component mounts
  useEffect(() => {
    if (!isLoading) {
      fetchUsers();
    }
  }, [isLoading]);
  
  // Handle search functionality
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
      return;
    }
    
    const query = searchQuery.toLowerCase().trim();
    const filtered = users.filter(user => 
      user.email.toLowerCase().includes(query) || 
      user.access_key.toLowerCase().includes(query)
    );
    
    setFilteredUsers(filtered);
  }, [searchQuery, users]);
  
  // Clear search query
  const handleClearSearch = () => {
    setSearchQuery('');
  };
  
  // Handle form field changes for new user
  const handleNewUserChange = (field: string, value: string | number) => {
    setNewUser(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Create new user
  const handleCreateUser = async () => {
    // Validate email
    if (!newUser.email || !newUser.email.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }
    
    setIsCreatingUser(true);
    
    try {
      // Use the proxy API to avoid CORS issues
      const timestamp = new Date().getTime();
      const response = await fetch(`${API_PROXY_URL}?_t=${timestamp}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: '/users',  // The proxy will add the base URL and API key
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          data: newUser
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Full error response:', data);
        throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(data)}`);
      }
      
      if (data.error) {
        console.error('API returned error:', data.error);
        throw new Error(data.error);
      }
      
      toast({
        title: "User created successfully",
        description: `New user ${newUser.email} has been created`,
      });
      
      // Reset form and close dialog
      setNewUser({
        email: '',
        initial_credits: 100,
        plan_type: 'credit_based'
      });
      setShowCreateDialog(false);
      
      // Refresh users list
      fetchUsers();
      
    } catch (err: any) {
      console.error('Error creating user:', err);
      toast({
        title: "Failed to create user",
        description: err.message || "There was an error creating the user",
        variant: "destructive"
      });
      
      // Show a more detailed error in the console for debugging
      console.log('Full error object:', err);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">OmniDashboard</h1>
        <div className="flex items-center gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">Signed in as: <span className="font-medium text-indigo-600 dark:text-indigo-400">{username}</span></p>
          <a 
            href="https://manovermachine-api.netlify.app" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
          >
            ManOverMachine API Documentation
          </a>
          <ThemeToggle />
          <Button onClick={handleSignOut} variant="outline" size="sm" className="border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:bg-indigo-950/50">
            Sign Out
          </Button>
        </div>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="bg-gradient-to-r from-indigo-100 to-violet-100 dark:from-indigo-900/40 dark:to-violet-900/40 border border-indigo-200 dark:border-indigo-800">
          <TabsTrigger value="users" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white">Users</TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="mt-6">
          <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950 dark:to-gray-900">
            <CardHeader>
              <CardTitle className="text-indigo-900 dark:text-indigo-300 font-bold">User Management</CardTitle>
              <CardDescription className="text-indigo-600 dark:text-indigo-400">
                View and manage all users in the system.
              </CardDescription>
              <div className="flex flex-col sm:flex-row justify-between gap-4 mt-4">
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <div className="relative w-full sm:w-96">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search by email or API key..."
                      className="pl-8 w-full"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        onClick={handleClearSearch}
                        className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground"
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Button 
                    onClick={() => setShowCreateDialog(true)} 
                    className="whitespace-nowrap bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-0 shadow-md"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create User
                  </Button>
                </div>
                <Button 
                  onClick={fetchUsers} 
                  size="sm" 
                  disabled={isLoadingUsers} 
                  className="whitespace-nowrap bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-md"
                >
                  {isLoadingUsers ? 'Refreshing...' : 'Refresh Users'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-4">
                  {error}
                </div>
              )}
              <UsersTable users={filteredUsers} isLoading={isLoadingUsers} domainUsage={domainUsage} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-6">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
      
      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[425px] bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-gray-900 border-0 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-indigo-900 dark:text-indigo-300 font-bold">Create New User</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Add a new user to the system with initial credits and plan type.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <div className="col-span-3">
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={newUser.email}
                  onChange={(e) => handleNewUserChange('email', e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="initial_credits" className="text-right">
                Initial Credits
              </Label>
              <div className="col-span-3">
                <Input
                  id="initial_credits"
                  type="number"
                  value={newUser.initial_credits}
                  onChange={(e) => handleNewUserChange('initial_credits', Number(e.target.value))}
                  min="0"
                  step="10"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="plan_type" className="text-right">
                Plan Type
              </Label>
              <div className="col-span-3">
                <Select 
                  value={newUser.plan_type} 
                  onValueChange={(value) => handleNewUserChange('plan_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit_based">Credit Based</SelectItem>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)} 
              disabled={isCreatingUser}
              className="border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateUser} 
              disabled={isCreatingUser}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white border-0 shadow-md"
            >
              {isCreatingUser ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>Create User</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
