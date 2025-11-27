-- Make topics more specific and concrete for better gameplay
-- Abstract topics are too difficult to guess

-- Update existing abstract topics to be more specific
UPDATE master_topics SET topic_text = '音楽室' WHERE topic_text = '音楽';
UPDATE master_topics SET topic_text = '体育祭' WHERE topic_text = '体育';
UPDATE master_topics SET topic_text = 'マグロ' WHERE topic_text = '魚';

-- Add more specific variations for other potentially abstract topics
-- You can add more UPDATE statements here as needed
UPDATE master_topics SET topic_text = '野球場' WHERE topic_text = 'スポーツ';
UPDATE master_topics SET topic_text = 'ラーメン' WHERE topic_text = '食べ物';
UPDATE master_topics SET topic_text = 'サッカーボール' WHERE topic_text = 'ボール';
