-- Add INSERT policy for results table
DROP POLICY IF EXISTS "anon_insert_results" ON results;
CREATE POLICY "anon_insert_results" ON results FOR INSERT WITH CHECK (true);
