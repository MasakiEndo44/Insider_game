-- Fix Host update access policy for rooms table
-- Previous policy incorrectly compared host_id (Player UUID) with auth.uid() (User UUID)

-- Drop existing incorrect policy
DROP POLICY IF EXISTS "Host update access" ON rooms;

-- Create correct policy
-- Allows update if:
-- 1. host_id is NULL (during room creation before host is assigned)
-- 2. The user owns the player record referenced by host_id
CREATE POLICY "Host update access" ON rooms FOR UPDATE USING (
  host_id IS NULL OR 
  EXISTS (
    SELECT 1 FROM players
    WHERE players.id = rooms.host_id
    AND players.user_id = auth.uid()
  )
);

-- Ensure anon_update_rooms is dropped if it exists (to enforce strict RLS)
DROP POLICY IF EXISTS "anon_update_rooms" ON rooms;
