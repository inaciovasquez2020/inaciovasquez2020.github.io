#!/usr/bin/env bash
set -euo pipefail
targets=()
[ -f index.html ] && targets+=(index.html)
[ -f README.md ] && targets+=(README.md)
[ -d docs ] && targets+=(docs)
if [ "${#targets[@]}" -gt 0 ]; then
  ! rg -n '\[cite:[^]]+\]' "${targets[@]}"
  ! rg -n 'to be created' "${targets[@]}"
fi
