#!/usr/bin/env node
// CI 상태 한국어 요약 — gh CLI 로 PR 체크 롤업을 읽어 한눈에 보이게 출력한다.
//
//   pnpm ci:summary            # 현재 브랜치의 PR
//   pnpm ci:summary 171        # PR 번호 지정
//   pnpm ci:summary --watch    # 완료(전체 종결)될 때까지 20초 간격 재조회
//
// 실패한 잡은 gh run 로그 꼬리를 함께 보여준다. gh 로그인(gh auth login) 필요.
import { execFileSync } from "node:child_process";

const JOB_LABELS = {
  "web (Next.js)": "웹 빌드·테스트 (Next.js)",
  "api (Spring Boot)": "백엔드 빌드·테스트 (Spring Boot)",
  "e2e (smoke)": "브라우저 스모크 테스트 (Playwright)",
  "security (deps scan)": "의존성 보안 스캔",
  "main PR source gate": "main 브랜치 보호 게이트",
  "auto-merge": "자동 머지",
  "api image": "도커 이미지 검증 (api)",
  "web image": "도커 이미지 검증 (web)",
};

const STATUS_LABELS = {
  SUCCESS: "✅ 성공",
  FAILURE: "❌ 실패",
  CANCELLED: "🚫 취소됨",
  TIMED_OUT: "⏰ 시간 초과",
  ACTION_REQUIRED: "✋ 조치 필요",
  NEUTRAL: "◽ 중립",
  SKIPPED: "⏭️ 건너뜀",
  STALE: "🕸️ 무효화됨",
  IN_PROGRESS: "⏳ 진행 중",
  QUEUED: "🕐 대기 중",
  PENDING: "🕐 대기 중",
  WAITING: "🕐 승인 대기",
  REQUESTED: "🕐 대기 중",
  EXPECTED: "🕐 대기 중",
  ERROR: "❌ 오류",
  STARTUP_FAILURE: "❌ 시작 실패",
};

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function parseArgs(argv) {
  const watch = argv.includes("--watch");
  const pr = argv.find((a) => /^\d+$/.test(a)) ?? null;
  return { pr, watch };
}

function fetchPr(prNumber) {
  const target = prNumber ? [prNumber] : [];
  const raw = gh(["pr", "view", ...target, "--json", "number,title,state,url,headRefName,statusCheckRollup,mergeStateStatus"]);
  return JSON.parse(raw);
}

function normalize(check) {
  // GitHub Actions 잡은 conclusion, 외부 status context 는 state 에 실린다.
  const status = (check.conclusion || check.state || check.status || "").toUpperCase() || "IN_PROGRESS";
  return {
    name: check.name || check.context || "(이름 없음)",
    status,
    url: check.detailsUrl || check.targetUrl || "",
    startedAt: check.startedAt,
    completedAt: check.completedAt,
  };
}

function durationLabel(check) {
  if (!check.startedAt) return "";
  const end = check.completedAt ? new Date(check.completedAt) : new Date();
  const seconds = Math.max(0, Math.round((end - new Date(check.startedAt)) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? ` · ${m}분 ${s}초` : ` · ${s}초`;
}

function failedJobLogTail(url) {
  // detailsUrl 형식: .../actions/runs/<runId>/job/<jobId>
  const match = url.match(/\/actions\/runs\/(\d+)\/job\/(\d+)/);
  if (!match) return null;
  try {
    const log = gh(["run", "view", "--job", match[2], "--log-failed"]);
    const lines = log.trimEnd().split("\n");
    return lines.slice(-15).join("\n");
  } catch {
    return null;
  }
}

// 통과로 볼 수 없는 종결 상태 — CANCELLED/ERROR/STARTUP_FAILURE 등도 "조치 필요"로 계산한다.
const BAD_STATUSES = new Set(["FAILURE", "TIMED_OUT", "CANCELLED", "ERROR", "ACTION_REQUIRED", "STALE", "STARTUP_FAILURE"]);
const PENDING_STATUSES = new Set(["IN_PROGRESS", "QUEUED", "PENDING", "WAITING", "REQUESTED", "EXPECTED"]);

function render(pr, { includeLogs = true } = {}) {
  const checks = (pr.statusCheckRollup ?? []).map(normalize).filter((c) => c.name !== "(이름 없음)");
  const lines = [];
  lines.push(`PR #${pr.number} · ${pr.title}`);
  lines.push(pr.url);
  lines.push("");

  if (checks.length === 0) {
    lines.push("아직 CI 체크가 시작되지 않았습니다.");
    return { text: lines.join("\n"), settled: false, failed: [] };
  }

  const failed = [];
  for (const check of checks) {
    const label = JOB_LABELS[check.name] ?? check.name;
    const status = STATUS_LABELS[check.status] ?? `❔ ${check.status}`;
    lines.push(`  ${status} — ${label}${durationLabel(check)}`);
    if (BAD_STATUSES.has(check.status)) failed.push(check);
  }

  const pendingCount = checks.filter((c) => PENDING_STATUSES.has(c.status)).length;
  const settled = pendingCount === 0;

  lines.push("");
  if (pr.state === "MERGED") {
    lines.push("종합: 🎉 이미 머지된 PR 입니다.");
  } else if (failed.length > 0) {
    lines.push(`종합: ❌ ${failed.length}개 체크가 통과하지 못했습니다(실패·취소·오류 포함) — 상태와 로그를 확인하세요.`);
  } else if (!settled) {
    lines.push(`종합: ⏳ ${pendingCount}개 잡 진행 중 — 전부 성공하면 auto-merge 잡이 자동으로 머지합니다.`);
  } else {
    lines.push("종합: ✅ 모든 체크 통과 — auto-merge 대상이면 곧 머지됩니다.");
  }

  for (const check of failed) {
    if (!includeLogs) break; // watch 중간 회차 — 최종 회차에만 로그를 내려받는다.
    const tail = failedJobLogTail(check.url);
    lines.push("");
    lines.push(`──── ${JOB_LABELS[check.name] ?? check.name} 실패 로그 (마지막 15줄) ────`);
    lines.push(tail ?? `로그를 가져오지 못했습니다. 직접 확인: ${check.url}`);
  }

  return { text: lines.join("\n"), settled: settled || pr.state === "MERGED", failed };
}

const { pr: prArg, watch } = parseArgs(process.argv.slice(2));

async function main() {
  for (;;) {
    let pr;
    try {
      pr = fetchPr(prArg);
    } catch (error) {
      const detail = error.stderr?.toString().trim() || error.message;
      console.error(`PR 정보를 가져오지 못했습니다. gh 로그인 상태와 PR 번호를 확인하세요.\n${detail}`);
      process.exit(1);
    }
    // watch 미종결 회차에는 실패 로그 tail 을 생략해 같은 로그를 20초마다 재다운로드하지 않는다.
    const probe = render(pr, { includeLogs: false });
    const { text, settled, failed } = probe.settled || !watch ? render(pr) : probe;
    console.log(text);
    if (!watch || settled) process.exit(failed.length > 0 ? 2 : 0);
    console.log("\n(20초 후 재조회 — 중단하려면 Ctrl+C)\n");
    await new Promise((resolve) => setTimeout(resolve, 20_000));
  }
}

main();
