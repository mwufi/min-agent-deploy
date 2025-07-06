import type { Gmail } from 'gmail-js';

export interface GmailAction {
  type: string;
  timestamp: number;
  data?: any;
}

export interface EmailData {
  threadId?: string;
  messageId?: string;
  subject?: string;
  from?: {
    email?: string;
    name?: string;
  };
  to?: Array<{
    email?: string;
    name?: string;
  }>;
  body?: string;
}

export class GmailContext {
  private actions: GmailAction[] = [];
  private readonly maxActions = 15;
  private gmail: Gmail | null = null;
  private currentEmail: EmailData | null = null;
  private selectedThreadIds: string[] = [];

  constructor(gmail?: Gmail) {
    if (gmail) {
      this.gmail = gmail;
      this.setupEventListeners();
    }
  }

  private setupEventListeners() {
    if (!this.gmail) return;

    // Track view changes
    this.gmail.observe.on('view_thread', (thread) => {
      this.addAction('view_thread', { threadId: thread.id });
      this.updateCurrentEmail();
    });

    this.gmail.observe.on('view_email', (email) => {
      this.addAction('view_email', { messageId: email.id });
      this.updateCurrentEmail();
    });

    // Track compose and reply
    this.gmail.observe.on('compose', () => {
      this.addAction('compose');
    });

    this.gmail.observe.on('reply', (data) => {
      this.addAction('reply', data);
    });

    // Track email actions
    this.gmail.observe.on('archive', (data) => {
      this.addAction('archive', data);
    });

    this.gmail.observe.on('delete', (data) => {
      this.addAction('delete', data);
    });

    this.gmail.observe.on('mark_as_read', (data) => {
      this.addAction('mark_as_read', data);
    });

    this.gmail.observe.on('mark_as_unread', (data) => {
      this.addAction('mark_as_unread', data);
    });

    this.gmail.observe.on('star', (data) => {
      this.addAction('star', data);
    });

    // Track navigation
    this.gmail.observe.on('http_event', (params) => {
      if (params.url?.includes('inbox')) {
        this.addAction('navigate_inbox');
      } else if (params.url?.includes('sent')) {
        this.addAction('navigate_sent');
      } else if (params.url?.includes('drafts')) {
        this.addAction('navigate_drafts');
      }
    });

    // Track selection changes
    this.gmail.observe.on('select_thread', (thread) => {
      if (!this.selectedThreadIds.includes(thread.id)) {
        this.selectedThreadIds.push(thread.id);
      }
      this.addAction('select_thread', { 
        threadId: thread.id,
        totalSelected: this.selectedThreadIds.length 
      });
    });

    this.gmail.observe.on('deselect_thread', (thread) => {
      this.selectedThreadIds = this.selectedThreadIds.filter(id => id !== thread.id);
      this.addAction('deselect_thread', { 
        threadId: thread.id,
        totalSelected: this.selectedThreadIds.length 
      });
    });
  }

  private addAction(type: string, data?: any) {
    const action: GmailAction = {
      type,
      timestamp: Date.now(),
      data
    };

    this.actions.unshift(action);
    
    // Keep only the last N actions
    if (this.actions.length > this.maxActions) {
      this.actions = this.actions.slice(0, this.maxActions);
    }

    console.log('[GmailContext] Action:', type, data);
    console.log('[GmailContext] Recent actions:', this.getRecentActions());
  }

  private updateCurrentEmail() {
    if (!this.gmail) return;

    try {
      const email = this.gmail.get.email_data();
      if (email) {
        this.currentEmail = {
          threadId: email.thread_id,
          messageId: email.id,
          subject: email.subject,
          from: {
            email: email.from?.email,
            name: email.from?.name
          },
          to: email.to?.map(recipient => ({
            email: recipient.email,
            name: recipient.name
          })),
          body: email.content_plain || email.content_html
        };
        
        console.log('[GmailContext] Current email updated:', this.currentEmail);
      }
    } catch (error) {
      console.error('[GmailContext] Error updating current email:', error);
    }
  }

  getRecentActions(): GmailAction[] {
    return [...this.actions];
  }

  getCurrentEmail(): EmailData | null {
    return this.currentEmail;
  }

  getSelectedThreadIds(): string[] {
    return [...this.selectedThreadIds];
  }

  clearSelection() {
    this.selectedThreadIds = [];
  }

  getContext() {
    return {
      recentActions: this.getRecentActions(),
      currentEmail: this.getCurrentEmail(),
      selectedThreadIds: this.getSelectedThreadIds(),
      timestamp: Date.now()
    };
  }
}