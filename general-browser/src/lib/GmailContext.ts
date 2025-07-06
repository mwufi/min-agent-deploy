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
  snippet?: string;
  date?: string;
  labels?: string[];
}

export class GmailContext {
  private actions: GmailAction[] = [];
  private readonly maxActions = 15;
  private gmail: Gmail | null = null;
  private currentEmail: EmailData | null = null;
  private selectedThreadIds: string[] = [];
  private selectedEmails: EmailData[] = [];

  constructor(gmail?: Gmail) {
    if (gmail) {
      this.gmail = gmail;
      this.setupEventListeners();
    }
  }

  private setupEventListeners() {
    if (!this.gmail) return;

    // Track view changes and update email data using new API
    this.gmail.observe.on('view_thread', (thread) => {
      this.addAction('view_thread', { threadId: thread.id });
      // Use a slight delay to ensure DOM is ready
      setTimeout(() => this.updateCurrentEmail(), 100);
    });

    this.gmail.observe.on('view_email', (email) => {
      this.addAction('view_email', { messageId: email.id });
      // Use a slight delay to ensure DOM is ready
      setTimeout(() => this.updateCurrentEmail(), 100);
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

    // Track navigation via DOM observation (safer)
    this.gmail.observe.on('load', () => {
      const currentPage = window.location.hash;
      if (currentPage.includes('inbox')) {
        this.addAction('navigate_inbox');
      } else if (currentPage.includes('sent')) {
        this.addAction('navigate_sent');
      } else if (currentPage.includes('drafts')) {
        this.addAction('navigate_drafts');
      }
    });

    // Track selection changes - these events might not fire, so let's also use DOM observation
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
    
    // Alternative selection tracking via DOM observation
    this.trackSelectionViaDOM();
  }

  private addAction(type: string, data?: any) {
    // Debounce duplicate actions within 500ms
    const now = Date.now();
    const lastAction = this.actions[0];
    
    if (lastAction && 
        lastAction.type === type && 
        now - lastAction.timestamp < 500 &&
        JSON.stringify(lastAction.data) === JSON.stringify(data)) {
      return; // Skip duplicate
    }

    const action: GmailAction = {
      type,
      timestamp: now,
      data
    };

    this.actions.unshift(action);
    
    // Keep only the last N actions
    if (this.actions.length > this.maxActions) {
      this.actions = this.actions.slice(0, this.maxActions);
    }

    console.log('[GmailContext] Action:', type, data);
  }

  private updateCurrentEmail() {
    if (!this.gmail) return;

    try {
      // Use the new API to get thread ID from DOM
      const threadId = this.gmail.new.get.thread_id();
      
      if (threadId) {
        // Get email data using the new API (DOM-based, no API calls)
        const emailData = this.gmail.new.get.email_data(threadId);
        
        if (emailData) {
          this.currentEmail = {
            threadId: emailData.thread_id,
            messageId: emailData.id || threadId,
            subject: emailData.subject || 'No subject',
            from: {
              email: emailData.from?.email,
              name: emailData.from?.name || emailData.from?.email
            },
            to: emailData.to?.map((recipient: any) => ({
              email: recipient.email,
              name: recipient.name || recipient.email
            })),
            body: emailData.content_plain || emailData.content_html || ''
          };
          
          console.log('[GmailContext] Current email updated (new API):', this.currentEmail);
        }
      }
    } catch (error) {
      // The new API might not always work depending on Gmail's state
      console.log('[GmailContext] Could not extract email data:', error);
      this.currentEmail = null;
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
      selectedEmails: this.getSelectedEmails(),
      timestamp: Date.now()
    };
  }
  
  getSelectedEmails(): EmailData[] {
    return [...this.selectedEmails];
  }

  private trackSelectionViaDOM() {
    let lastSelectionCount = 0;
    
    // Poll for selection changes every 500ms
    setInterval(() => {
      try {
        // Find all selected thread rows
        const selectedRows: EmailData[] = [];
        const selectedIds: string[] = [];
        
        // Find all thread rows and check if they're selected
        const allRows = document.querySelectorAll('tr.zA');
        
        allRows.forEach((row: Element) => {
          const checkbox = row.querySelector('div[role="checkbox"][aria-checked="true"], td.xY input[type="checkbox"]:checked');
          if (!checkbox) return; // Skip unselected rows
          try {
            // Extract email data from the row
            const threadId = row.getAttribute('id') || '';
            const senderElement = row.querySelector('.yW span[email]') || row.querySelector('.yW');
            const subjectElement = row.querySelector('.y6 span[id]:not([aria-label])') || row.querySelector('.y6');
            const snippetElement = row.querySelector('.y2');
            const dateElement = row.querySelector('.xW span[title]') || row.querySelector('.xW');
            
            // Extract labels
            const labelElements = row.querySelectorAll('.ar span.av');
            const labels: string[] = [];
            labelElements.forEach(label => {
              const text = label.textContent?.trim();
              if (text) labels.push(text);
            });
            
            const emailData: EmailData = {
              threadId,
              subject: subjectElement?.textContent?.trim() || 'No subject',
              from: {
                name: senderElement?.textContent?.trim() || 'Unknown sender',
                email: senderElement?.getAttribute('email') || undefined
              },
              snippet: snippetElement?.textContent?.trim(),
              date: dateElement?.getAttribute('title') || dateElement?.textContent?.trim(),
              labels
            };
            
            selectedRows.push(emailData);
            selectedIds.push(threadId);
          } catch (e) {
            // Skip this row if parsing fails
          }
        });
        
        const currentCount = selectedRows.length;
        
        // Update internal state
        this.selectedEmails = selectedRows;
        this.selectedThreadIds = selectedIds;
        
        // Only log if selection changed
        if (currentCount !== lastSelectionCount) {
          console.log(`[GmailContext] Selection changed: ${lastSelectionCount} -> ${currentCount} items selected`);
          console.log('[GmailContext] Selected emails:', selectedRows);
          
          if (currentCount > lastSelectionCount) {
            this.addAction('select_threads', { 
              count: currentCount,
              emails: selectedRows
            });
          } else {
            this.addAction('deselect_threads', { 
              count: currentCount,
              emails: selectedRows
            });
          }
          
          lastSelectionCount = currentCount;
        }
      } catch (error) {
        console.error('[GmailContext] Error tracking selection:', error);
      }
    }, 500);
  }
}