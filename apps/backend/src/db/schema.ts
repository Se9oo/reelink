import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';

const id = () => uuid('id').primaryKey().$defaultFn(() => uuidv7());

export const users = pgTable('users', {
  id: id(),
  email: text('email').notNull(),
  nickname: text('nickname').notNull(),
  reminderIntervalDays: integer('reminder_interval_days').notNull().default(7),
  notificationMethod: text('notification_method').notNull().default('manual'),
});

export const accounts = pgTable(
  'accounts',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
  },
  (table) => [
    unique('accounts_provider_account_id_unique').on(
      table.provider,
      table.providerAccountId,
    ),
  ],
);

export const notificationChannels = pgTable(
  'notification_channels',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    externalId: text('external_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    status: text('status').notNull().default('active'),
  },
  (table) => [
    unique('notification_channels_user_provider_unique').on(
      table.userId,
      table.provider,
    ),
  ],
);

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dhKey: text('p256dh_key').notNull(),
  authKey: text('auth_key').notNull(),
});

export const kakaoBotLinks = pgTable('kakao_bot_links', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  botUserKey: text('bot_user_key').notNull().unique(),
  linkedAt: timestamp('linked_at', { withTimezone: true }).notNull().defaultNow(),
});

export const kakaoBotLinkCodes = pgTable('kakao_bot_link_codes', {
  code: text('code').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const folders = pgTable('folders', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  parentFolderId: uuid('parent_folder_id').references(
    (): AnyPgColumn => folders.id,
    { onDelete: 'cascade' },
  ),
  name: text('name').notNull(),
  isSystem: boolean('is_system').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const links = pgTable('links', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  folderId: uuid('folder_id')
    .notNull()
    .references(() => folders.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  title: text('title'),
  thumbnailUrl: text('thumbnail_url'),
  folderSource: text('folder_source').notNull().default('user'),
  shelfLifeDays: integer('shelf_life_days'),
  savedReason: text('saved_reason'),
  status: text('status').notNull().default('unviewed'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastRemindedAt: timestamp('last_reminded_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
