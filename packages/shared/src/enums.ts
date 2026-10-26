import { z } from 'zod';

// Mirrors the Postgres ENUM types in docs/database.md §3. Values are never removed.

export const UserRole = z.enum(['customer', 'organizer', 'admin']);
export type UserRole = z.infer<typeof UserRole>;

export const UserStatus = z.enum(['active', 'disabled']);
export type UserStatus = z.infer<typeof UserStatus>;

export const EventStatus = z.enum(['draft', 'published', 'cancelled', 'completed']);
export type EventStatus = z.infer<typeof EventStatus>;

export const EventCategory = z.enum([
  'concert',
  'movie',
  'theatre',
  'comedy',
  'sports',
  'conference',
  'other',
]);
export type EventCategory = z.infer<typeof EventCategory>;

export const SeatStatus = z.enum(['available', 'held', 'sold', 'blocked']);
export type SeatStatus = z.infer<typeof SeatStatus>;

export const HoldStatus = z.enum(['active', 'released', 'expired', 'converted']);
export type HoldStatus = z.infer<typeof HoldStatus>;

export const OrderStatus = z.enum([
  'pending',
  'paid',
  'failed',
  'expired',
  'failed_conflict',
  'refunded',
]);
export type OrderStatus = z.infer<typeof OrderStatus>;

export const TicketStatus = z.enum(['valid', 'used', 'cancelled']);
export type TicketStatus = z.infer<typeof TicketStatus>;
