#!/bin/sh
# Runs RoleUp worker tasks inside the workers image. Extra args are passed to the task,
# e.g. `roleup-worker crawl --company stripe` or `roleup-worker track-funding --dry-run`.
set -eu

TSX=/app/workers/node_modules/.bin/tsx
task="${1:-crawl}"
[ "$#" -gt 0 ] && shift

run_db() { (cd /app/packages/db && "$TSX" "src/$1.ts"); }
run_worker() {
  script="$1"
  shift
  (cd /app/workers && "$TSX" "src/$script.ts" "$@")
}

case "$task" in
  migrate) run_db migrate ;;
  seed) run_worker seed "$@" ;;
  setup)
    run_db migrate
    run_worker seed
    ;;
  crawl) run_worker crawl-jobs "$@" ;;
  sync-yc | track-funding | verify-funding | discover-companies | detect-ats | verify-seed) run_worker "$task" "$@" ;;
  daily)
    run_worker sync-yc
    run_worker track-funding
    run_worker discover-companies
    run_worker detect-ats
    ;;
  all)
    run_db migrate
    run_worker seed
    run_worker crawl-jobs
    run_worker sync-yc
    run_worker track-funding
    run_worker discover-companies
    run_worker detect-ats
    ;;
  *)
    echo "Unknown task: $task" >&2
    echo "Tasks: setup migrate seed crawl sync-yc track-funding verify-funding discover-companies detect-ats verify-seed daily all" >&2
    exit 64
    ;;
esac
