#!/usr/bin/env bash
# PR 생성 직전 호출되는 hook. 이번 세션에서 qa-tester 서브에이전트 실행 여부를 확인.
# 미실행이면 PR 생성을 차단하고 QA 리뷰를 먼저 돌리도록 Claude에 안내.
set -u
PAYLOAD=$(cat)
SID=$(echo "$PAYLOAD" | jq -r '.session_id // empty')
FLAG="/tmp/firstep-qa-${SID}.flag"

if [ -n "$SID" ] && [ -f "$FLAG" ]; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: "qa-tester 리뷰 확인됨 - PR 생성 허용"
    }
  }'
else
  jq -n --arg flag "$FLAG" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: ("⛔ PR 생성 차단: 이번 세션에서 qa-tester 서브에이전트로 QA 리뷰를 아직 실행하지 않았습니다. Task tool에 subagent_type=\"qa-tester\"로 호출해 Firstep PRD 기반 체크리스트 리뷰를 받은 뒤, 🔴 치명 이슈가 없음을 확인하고 이 PR을 다시 시도하세요. (우회가 필요하면 `touch " + $flag + "` 후 재시도)")
    }
  }'
fi
exit 0
