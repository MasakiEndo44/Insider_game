-- 投票集計用関数
CREATE OR REPLACE FUNCTION check_vote_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_session_id UUID;
  v_total_players INT;
  v_voted_players INT;
  v_vote_type TEXT;
  v_phase TEXT;
  v_yes_votes INT;
  v_no_votes INT;
  v_answerer_id UUID;
  v_insider_id UUID;
  v_outcome TEXT;
  v_room_id UUID;
BEGIN
  -- 投票のセッションIDとタイプを取得
  v_session_id := NEW.session_id;
  v_vote_type := NEW.vote_type;
  
  -- 現在のフェーズとRoomIDを取得
  SELECT phase, room_id INTO v_phase, v_room_id
  FROM game_sessions
  WHERE id = v_session_id;
  
  -- 投票タイプとフェーズが一致しない場合は何もしない
  IF NOT ((v_vote_type = 'VOTE1' AND v_phase = 'VOTE1') OR
          (v_vote_type = 'VOTE2' AND v_phase = 'VOTE2')) THEN
    RETURN NEW;
  END IF;
  
  -- 総プレイヤー数を取得
  SELECT COUNT(*) INTO v_total_players
  FROM roles
  WHERE session_id = v_session_id;
  
  -- 投票済みプレイヤー数を取得
  SELECT COUNT(DISTINCT player_id) INTO v_voted_players
  FROM votes
  WHERE session_id = v_session_id
    AND vote_type = v_vote_type;
  
  -- 全員が投票完了した場合
  IF v_voted_players >= v_total_players THEN
    IF v_vote_type = 'VOTE1' THEN
      -- VOTE1集計
      SELECT COUNT(*) INTO v_yes_votes
      FROM votes
      WHERE session_id = v_session_id AND vote_type = 'VOTE1' AND vote_value = 'yes';
      
      SELECT COUNT(*) INTO v_no_votes
      FROM votes
      WHERE session_id = v_session_id AND vote_type = 'VOTE1' AND vote_value = 'no';
      
      IF v_yes_votes > v_no_votes THEN
        -- 過半数がYES: 正解者をインサイダーと疑っている
        
        -- 正解者IDを取得
        SELECT answerer_id INTO v_answerer_id FROM game_sessions WHERE id = v_session_id;
        
        -- インサイダーIDを取得
        SELECT player_id INTO v_insider_id FROM roles WHERE session_id = v_session_id AND role = 'INSIDER';
        
        IF v_answerer_id = v_insider_id THEN
           -- 正解者がインサイダーだった -> 庶民の勝ち
           v_outcome := 'CITIZENS_WIN';
        ELSE
           -- 正解者はインサイダーではなかった -> インサイダーの勝ち
           v_outcome := 'INSIDER_WIN';
        END IF;
        
        -- 結果を保存
        INSERT INTO results (session_id, outcome, revealed_player_id)
        VALUES (v_session_id, v_outcome, v_insider_id);
        
        -- フェーズをRESULTに更新
        UPDATE game_sessions SET phase = 'RESULT' WHERE id = v_session_id;
        UPDATE rooms SET phase = 'RESULT' WHERE id = v_room_id;
        
      ELSE
        -- 過半数がNO: VOTE2へ
        UPDATE game_sessions SET phase = 'VOTE2' WHERE id = v_session_id;
        UPDATE rooms SET phase = 'VOTE2' WHERE id = v_room_id;
      END IF;

    ELSIF v_vote_type = 'VOTE2' THEN
      -- VOTE2完了 → 結果を計算してRESULTに更新
      UPDATE game_sessions SET phase = 'RESULT' WHERE id = v_session_id;
      UPDATE rooms SET phase = 'RESULT' WHERE id = v_room_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーの作成
DROP TRIGGER IF EXISTS trigger_check_vote_completion ON votes;
CREATE TRIGGER trigger_check_vote_completion
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION check_vote_completion();
