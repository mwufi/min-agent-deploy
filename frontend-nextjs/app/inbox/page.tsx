'use client';

import { useGmailThreads } from '@/lib/hooks/use-gmail-threads';
import { useGmailAccounts } from '@/lib/hooks/use-gmail-accounts';
import { Star, StarOff, Archive, Trash2, Mail, MoreVertical } from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function formatEmailTime(dateString: string): string {
  try {
    // Handle both ISO strings and locale strings
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return dateString;
    }

    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      const now = new Date();
      const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (diffInDays < 7) {
        return format(date, 'EEE');
      } else if (diffInDays < 365) {
        return format(date, 'MMM d');
      } else {
        return format(date, 'MMM d, yyyy');
      }
    }
  } catch {
    return dateString;
  }
}

function truncateSubject(subject: string, maxLength: number = 80): string {
  if (subject.length <= maxLength) return subject;
  return subject.substring(0, maxLength - 3) + '...';
}

export default function InboxPage() {
  const { data: accountsData, isLoading: accountsLoading } = useGmailAccounts();
  const defaultAccount = accountsData?.[0];
  const { data, isLoading, error } = useGmailThreads({ accountId: defaultAccount?.id });
  const [selectedThreads, setSelectedThreads] = useState<Set<string>>(new Set());
  const [starredThreads, setStarredThreads] = useState<Set<string>>(new Set());

  const toggleThreadSelection = (threadId: string) => {
    const newSelection = new Set(selectedThreads);
    if (newSelection.has(threadId)) {
      newSelection.delete(threadId);
    } else {
      newSelection.add(threadId);
    }
    setSelectedThreads(newSelection);
  };

  const toggleStar = (threadId: string) => {
    const newStarred = new Set(starredThreads);
    if (newStarred.has(threadId)) {
      newStarred.delete(threadId);
    } else {
      newStarred.add(threadId);
    }
    setStarredThreads(newStarred);
  };

  if (accountsLoading || isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inbox</h2>
          <p className="text-muted-foreground">View your recent email threads</p>
        </div>
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-4" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inbox</h2>
          <p className="text-muted-foreground">View your recent email threads</p>
        </div>
        <Card className="p-6">
          <p className="text-destructive">Error loading email threads. Please try again.</p>
        </Card>
      </div>
    );
  }

  if (!accountsData?.length) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inbox</h2>
          <p className="text-muted-foreground">View your recent email threads</p>
        </div>
        <Card className="p-6">
          <p className="text-muted-foreground">No Gmail accounts connected. Please connect an account first.</p>
        </Card>
      </div>
    );
  }

  const threads = data?.threads || [];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inbox</h2>
          <p className="text-muted-foreground">
            {threads.length} conversation{threads.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </Button>
          <Button variant="outline" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Mark all as read</DropdownMenuItem>
              <DropdownMenuItem>Mark all as unread</DropdownMenuItem>
              <DropdownMenuItem>Select all</DropdownMenuItem>
              <DropdownMenuItem>Deselect all</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-lg bg-card">
        {threads.length === 0 ? (
          <div className="p-8 text-center">
            <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No emails yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your inbox is empty. New emails will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {threads.map((thread) => (
              <div
                key={thread.threadId}
                className="flex items-center space-x-4 px-4 py-2 hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  checked={selectedThreads.has(thread.threadId)}
                  onCheckedChange={() => toggleThreadSelection(thread.threadId)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-auto"
                  onClick={() => toggleStar(thread.threadId)}
                >
                  {starredThreads.has(thread.threadId) ? (
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ) : (
                    <Star className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium truncate flex-shrink-0">{thread.sender}</span>
                    <span className="text-sm text-muted-foreground truncate">
                      {truncateSubject(thread.subject)}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatEmailTime(thread.time)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}