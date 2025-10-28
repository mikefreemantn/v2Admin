'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

// API key for accessing the ReIntent API
const API_KEY = 'ri_9fbcb675c4e1';
const API_BASE_URL = 'https://xwkwzbjifh.execute-api.us-east-2.amazonaws.com/v1';

/**
 * THIS IS A REFERENCE FILE ONLY
 * 
 * This file contains the working implementation of the notes functionality
 * from another project. It is provided as a reference to help fix the notes
 * functionality in our current implementation.
 * 
 * DO NOT USE ANY OTHER CODE FROM THIS FILE EXCEPT FOR THE NOTES-RELATED FUNCTIONALITY.
 */

export default function OldWorkingSourcePage() {
  const router = useRouter();
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [userNotes, setUserNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [user, setUser] = useState({
    user_id: '4085643f-7866-4a97-9401-390b87ecf17d',
    email: 'mike@manovermachine.com',
    access_key: 'ri_9fbcb675c4e1'
  });

  // Fetch user notes when component mounts
  useEffect(() => {
    if (user?.user_id) {
      fetchUserNotes(user.user_id);
    }
  }, [user]);

  // Fetch user notes from API
  const fetchUserNotes = async (userId: string) => {
    try {
      setIsLoadingNotes(true);
      console.log('Fetching notes for user ID:', userId);
      
      // Add a timestamp to bust cache
      const timestamp = new Date().getTime();
      
      // Make the API request through our proxy
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: `/admin/chart-notes`,
          method: 'GET',
          apiKey: API_KEY,
          queryParams: {
            user_id: userId,
            _: timestamp.toString() // Cache busting
          },
          skipCache: true // Important: Skip cache for notes to always get fresh data
        }),
      });
      
      if (!response.ok) {
        console.error('API response not OK:', response.status, response.statusText);
        throw new Error(`Failed to fetch user notes: ${response.status}`);
      }
      
      const responseBody = await response.json();
      console.log('User notes raw proxy response:', responseBody);
      
      // Extract the data from the proxy response
      const data = responseBody.data || responseBody;
      console.log('Extracted notes data:', data);
      
      // Check if notes are in the expected format
      if (Array.isArray(data.notes)) {
        console.log('Found notes in the expected format:', data.notes);
        
        // Process notes to add formatted dates
        const processedNotes = data.notes.map((note: any) => {
          // Convert created_at timestamp to formatted date if it exists
          let formattedDate = '';
          if (note.created_at) {
            const date = new Date(note.created_at * 1000);
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
          return (b.created_at || 0) - (a.created_at || 0);
        });
        
        console.log('Processed and sorted notes:', processedNotes);
        setUserNotes(processedNotes);
      } else {
        console.warn('No notes found or invalid format:', data);
        setUserNotes([]);
      }
    } catch (err: any) {
      console.error('Error fetching user notes:', err);
      setUserNotes([]);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  // Handle adding a new note
  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast({
        title: "Note cannot be empty",
        description: "Please enter some text for your note.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Get current admin user's name (for this example, hardcoding "Admin User")
      const adminName = "Admin User";
      
      // Create a note with the admin's name appended
      const noteWithSignature = `${newNote.trim()} - ${adminName}`;
      
      console.log(`Adding new note for user ${user.email}: ${noteWithSignature}`);
      
      // Create the note payload according to the API documentation
      const noteData = {
        title: `Note for ${user.email}`,
        content: noteWithSignature,
        date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
        context: 'user',
        user_id: user.user_id
      };
      
      console.log('Sending note data to API:', noteData);
      
      // Make the API request through our proxy
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: `/admin/chart-notes`,
          method: 'POST',
          apiKey: API_KEY,
          data: noteData
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to add note:', response.status, errorText);
        throw new Error(`Failed to add note: ${response.status}`);
      }
      
      const responseBody = await response.json();
      console.log('Note creation proxy response:', responseBody);
      
      // Extract the actual API response data
      const responseData = responseBody.data || responseBody;
      console.log('Extracted note creation response:', responseData);
      
      // Create a note object with the response data or fallback to our data
      const newNoteData = responseData.note || {
        id: `note_${Date.now()}`,
        ...noteData,
        created_at: Math.floor(Date.now() / 1000)
      };
      
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
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Reference Implementation - Notes Functionality</h1>
      <p className="mb-4 text-red-500 font-bold">
        THIS IS A REFERENCE FILE ONLY. Do not use any code from this file except for the notes-related functionality.
      </p>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Notes for {user.email}</CardTitle>
          <CardDescription>
            View and manage notes for this user
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">User Notes</h3>
            <Dialog open={isAddingNote} onOpenChange={setIsAddingNote}>
              <DialogTrigger asChild>
                <Button variant="outline">Add Note</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add a note for {user.email}</DialogTitle>
                  <DialogDescription>
                    This note will be associated with the user&apos;s profile.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Textarea
                    id="note"
                    placeholder="Enter your note here..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddingNote(false)}>Cancel</Button>
                  <Button onClick={handleAddNote}>Add Note</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          {isLoadingNotes ? (
            <div className="flex justify-center items-center h-32">
              <p>Loading notes...</p>
            </div>
          ) : userNotes.length > 0 ? (
            <div className="space-y-4">
              {userNotes.map((note, index) => (
                <div key={note.id || index} className="p-4 border rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="whitespace-pre-wrap">{note.content}</p>
                      <p className="text-sm text-gray-500 mt-2">{note.formatted_date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No notes found for this user.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="mt-6">
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
