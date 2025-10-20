/**
 * Zod Validation Schemas for Database Operations
 *
 * These schemas provide runtime validation for all database insert/update operations.
 * They match the database constraints defined in Supabase migrations.
 */

import { z } from 'zod';

// ============================================================
// Enum Schemas
// ============================================================

export const GamePhaseSchema = z.enum([
  'LOBBY',
  'DEAL',
  'TOPIC',
  'QUESTION',
  'DEBATE',
  'VOTE1',
  'VOTE2',
  'VOTE2_RUNOFF',
  'RESULT',
]);

export const DifficultySchema = z.enum(['Easy', 'Normal', 'Hard']);

export const RoleSchema = z.enum(['MASTER', 'INSIDER', 'CITIZEN']);

export const VoteTypeSchema = z.enum(['VOTE1', 'VOTE2', 'RUNOFF']);

export const OutcomeSchema = z.enum(['CITIZENS_WIN', 'INSIDER_WIN', 'ALL_LOSE']);

// ============================================================
// 1. Rooms Schema
// ============================================================

export const RoomInsertSchema = z.object({
  passphrase_hash: z
    .string()
    .min(1, 'Passphrase hash is required')
    .max(255, 'Passphrase hash too long'),
  host_id: z.string().uuid().optional().nullable(),
  phase: GamePhaseSchema.default('LOBBY'),
  is_suspended: z.boolean().default(false),
  suspended_state: z.any().optional().nullable(), // JSONB type
});

export const RoomUpdateSchema = z.object({
  host_id: z.string().uuid().optional().nullable(),
  phase: GamePhaseSchema.optional(),
  is_suspended: z.boolean().optional(),
  suspended_state: z.any().optional().nullable(), // JSONB type
});

// ============================================================
// 2. Players Schema
// ============================================================

export const PlayerInsertSchema = z.object({
  id: z.string().uuid(), // Auth user ID
  room_id: z.string().uuid(),
  nickname: z
    .string()
    .min(1, 'Nickname is required')
    .max(20, 'Nickname must be 20 characters or less')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Nickname must be alphanumeric'),
  is_host: z.boolean().default(false),
  is_connected: z.boolean().default(true),
  confirmed: z.boolean().default(false),
});

export const PlayerUpdateSchema = z.object({
  nickname: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  is_host: z.boolean().optional(),
  is_connected: z.boolean().optional(),
  confirmed: z.boolean().optional(),
});

// ============================================================
// 3. Game Sessions Schema
// ============================================================

export const GameSessionInsertSchema = z.object({
  room_id: z.string().uuid(),
  difficulty: DifficultySchema,
  start_time: z.string().datetime().optional().nullable(),
  deadline_epoch: z.number().int().positive().optional().nullable(),
  answerer_id: z.string().uuid().optional().nullable(),
  phase: GamePhaseSchema,
  prev_master_id: z.string().uuid().optional().nullable(),
});

export const GameSessionUpdateSchema = z.object({
  start_time: z.string().datetime().optional().nullable(),
  deadline_epoch: z.number().int().positive().optional().nullable(),
  answerer_id: z.string().uuid().optional().nullable(),
  phase: GamePhaseSchema.optional(),
});

// ============================================================
// 4. Roles Schema
// ============================================================

export const RoleInsertSchema = z.object({
  session_id: z.string().uuid(),
  player_id: z.string().uuid(),
  role: RoleSchema,
});

// ============================================================
// 5. Master Topics Schema
// ============================================================

export const MasterTopicInsertSchema = z.object({
  topic_text: z
    .string()
    .min(1, 'Topic text is required')
    .max(100, 'Topic text must be 100 characters or less'),
  difficulty: DifficultySchema,
  category: z.string().max(50).optional().nullable(),
});

// ============================================================
// 6. Topics Schema
// ============================================================

export const TopicInsertSchema = z.object({
  session_id: z.string().uuid(),
  topic_text: z.string().min(1).max(100),
  difficulty: DifficultySchema,
});

// ============================================================
// 7. Used Topics Schema
// ============================================================

export const UsedTopicInsertSchema = z.object({
  session_id: z.string().uuid(),
  topic_id: z.string().uuid(),
});

// ============================================================
// 8. Votes Schema
// ============================================================

export const VoteInsertSchema = z.object({
  session_id: z.string().uuid(),
  player_id: z.string().uuid(),
  vote_type: VoteTypeSchema,
  vote_value: z.string().max(255).optional().nullable(),
  round: z.number().int().positive().default(1),
});

// ============================================================
// 9. Results Schema
// ============================================================

export const ResultInsertSchema = z.object({
  session_id: z.string().uuid(),
  outcome: OutcomeSchema,
  revealed_player_id: z.string().uuid().optional().nullable(),
});

// ============================================================
// Client-Side Validation Schemas
// ============================================================

/**
 * Room Creation Form Schema
 * Used for validating room creation form input (before hashing passphrase)
 */
export const RoomCreationFormSchema = z.object({
  passphrase: z
    .string()
    .min(4, 'Passphrase must be at least 4 characters')
    .max(50, 'Passphrase must be 50 characters or less')
    .regex(
      /^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+$/,
      'Passphrase contains invalid characters'
    ),
});

/**
 * Room Join Form Schema
 * Used for validating room join form input (before verification)
 */
export const RoomJoinFormSchema = z.object({
  passphrase: z.string().min(1, 'Passphrase is required'),
});

/**
 * Player Nickname Form Schema
 * Used for validating player nickname input
 */
export const PlayerNicknameFormSchema = z.object({
  nickname: z
    .string()
    .min(1, 'Nickname is required')
    .max(20, 'Nickname must be 20 characters or less')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Nickname can only contain letters, numbers, underscores, and hyphens'
    ),
});

/**
 * Vote Submission Form Schema
 * Used for validating vote input before submission
 */
export const VoteSubmissionFormSchema = z.object({
  vote_type: VoteTypeSchema,
  vote_value: z.string().uuid().optional(), // Player UUID for VOTE2/RUNOFF, or "yes"/"no" for VOTE1
});

/**
 * Difficulty Selection Form Schema
 * Used for validating difficulty selection
 */
export const DifficultySelectionFormSchema = z.object({
  difficulty: DifficultySchema,
});

// ============================================================
// Type Exports (for TypeScript inference)
// ============================================================

export type GamePhase = z.infer<typeof GamePhaseSchema>;
export type Difficulty = z.infer<typeof DifficultySchema>;
export type Role = z.infer<typeof RoleSchema>;
export type VoteType = z.infer<typeof VoteTypeSchema>;
export type Outcome = z.infer<typeof OutcomeSchema>;

export type RoomInsert = z.infer<typeof RoomInsertSchema>;
export type RoomUpdate = z.infer<typeof RoomUpdateSchema>;
export type PlayerInsert = z.infer<typeof PlayerInsertSchema>;
export type PlayerUpdate = z.infer<typeof PlayerUpdateSchema>;
export type GameSessionInsert = z.infer<typeof GameSessionInsertSchema>;
export type GameSessionUpdate = z.infer<typeof GameSessionUpdateSchema>;
export type RoleInsert = z.infer<typeof RoleInsertSchema>;
export type MasterTopicInsert = z.infer<typeof MasterTopicInsertSchema>;
export type TopicInsert = z.infer<typeof TopicInsertSchema>;
export type UsedTopicInsert = z.infer<typeof UsedTopicInsertSchema>;
export type VoteInsert = z.infer<typeof VoteInsertSchema>;
export type ResultInsert = z.infer<typeof ResultInsertSchema>;

export type RoomCreationForm = z.infer<typeof RoomCreationFormSchema>;
export type RoomJoinForm = z.infer<typeof RoomJoinFormSchema>;
export type PlayerNicknameForm = z.infer<typeof PlayerNicknameFormSchema>;
export type VoteSubmissionForm = z.infer<typeof VoteSubmissionFormSchema>;
export type DifficultySelectionForm = z.infer<
  typeof DifficultySelectionFormSchema
>;
