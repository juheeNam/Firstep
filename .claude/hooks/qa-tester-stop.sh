#!/usr/bin/env bash
# qa-tester 서브에이전트 종료 시 세션별 flag 파일 생성.
# 이후 PR 생성 시 pre-create-pr.sh가 이 파일 존재를 확인해 QA 수행 여부 판정.
set -u
PAYLOAD=$(cat)
SID=$(echo "$PAYLOAD" | jq -r '.session_id // empty')
AGENT=$(echo "$PAYLOAD" | jq -r '.subagent_name // .agent_name // .agent // .name // empty')

# matcher가 agent 이름으로 필터링되지 않을 가능성 대비한 방어 체크.
# AGENT 값이 비어있을 수도 있으니(페이로드 키 이름 불확실) 둘 다 허용.
if [ -z "$AGENT" ] || [ "$AGENT" = "qa-tester" ]; then
  [ -n "$SID" ] && touch "/tmp/firstep-qa-${SID}.flag"
fi
exit 0
