-- Add INSERT policy for results table
CREATE POLICY "anon_insert_results" ON results FOR INSERT WITH CHECK (true);
