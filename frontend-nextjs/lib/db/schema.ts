import { pgTable, text, timestamp, integer, boolean, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

// Email threads table
export const emailThreads = pgTable('email_threads', {
  id: text('id').primaryKey(),
  threadId: text('thread_id').notNull(),
  userId: text('user_id').notNull(),
  accountId: text('account_id').notNull(),
  subject: text('subject'),
  snippet: text('snippet'),
  historyId: text('history_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    userAccountIdx: index('email_threads_user_account_idx').on(table.userId, table.accountId),
    threadIdIdx: uniqueIndex('email_threads_thread_id_idx').on(table.threadId, table.accountId),
  };
});

// Email messages table
export const emailMessages = pgTable('email_messages', {
  id: text('id').primaryKey(),
  messageId: text('message_id').notNull(),
  threadId: text('thread_id').notNull(),
  userId: text('user_id').notNull(),
  accountId: text('account_id').notNull(),
  from: text('from'),
  to: jsonb('to').$type<string[]>(),
  cc: jsonb('cc').$type<string[]>(),
  bcc: jsonb('bcc').$type<string[]>(),
  subject: text('subject'),
  snippet: text('snippet'),
  body: text('body'),
  bodyHtml: text('body_html'),
  labelIds: jsonb('label_ids').$type<string[]>(),
  isUnread: boolean('is_unread').default(true),
  historyId: text('history_id'),
  internalDate: timestamp('internal_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    userAccountIdx: index('email_messages_user_account_idx').on(table.userId, table.accountId),
    threadIdIdx: index('email_messages_thread_id_idx').on(table.threadId),
    messageIdIdx: uniqueIndex('email_messages_message_id_idx').on(table.messageId, table.accountId),
    internalDateIdx: index('email_messages_internal_date_idx').on(table.internalDate),
  };
});

// Gmail sync history table to track syncs and history IDs
export const gmailSyncHistory = pgTable('gmail_sync_history', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  accountId: text('account_id').notNull(),
  historyId: text('history_id').notNull(),
  syncType: text('sync_type').notNull(), // 'full' or 'incremental'
  messagesAdded: integer('messages_added').default(0),
  messagesModified: integer('messages_modified').default(0),
  messagesDeleted: integer('messages_deleted').default(0),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    userAccountIdx: index('gmail_sync_history_user_account_idx').on(table.userId, table.accountId),
    createdAtIdx: index('gmail_sync_history_created_at_idx').on(table.createdAt),
  };
});

// User accounts table to store Pipedream connected accounts
export const userAccounts = pgTable('user_accounts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().unique(),
  accounts: jsonb('accounts').notNull().$type<any[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index('user_accounts_user_id_idx').on(table.userId),
  };
});

// Type exports
export type EmailThread = typeof emailThreads.$inferSelect;
export type NewEmailThread = typeof emailThreads.$inferInsert;
export type EmailMessage = typeof emailMessages.$inferSelect;
export type NewEmailMessage = typeof emailMessages.$inferInsert;
export type GmailSyncHistory = typeof gmailSyncHistory.$inferSelect;
export type NewGmailSyncHistory = typeof gmailSyncHistory.$inferInsert;
export type UserAccounts = typeof userAccounts.$inferSelect;
export type NewUserAccounts = typeof userAccounts.$inferInsert;