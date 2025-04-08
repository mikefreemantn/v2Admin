'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950 dark:to-gray-900 border border-indigo-200 dark:border-indigo-800 hover:shadow-md transition-all duration-200">
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:rotate-90 dark:scale-0 text-amber-600" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-indigo-400" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800">
              <DropdownMenuItem 
                onClick={() => setTheme('light')}
                className={`flex items-center gap-2 ${theme === 'light' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : ''}`}
              >
                <Sun className="h-4 w-4 text-amber-600" />
                <span>Light</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-2 ${theme === 'dark' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : ''}`}
              >
                <Moon className="h-4 w-4 text-indigo-600" />
                <span>Dark</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setTheme('system')}
                className={`flex items-center gap-2 ${theme === 'system' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : ''}`}
              >
                <Monitor className="h-4 w-4 text-emerald-600" />
                <span>System</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Change theme</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
