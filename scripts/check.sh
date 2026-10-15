#!/usr/bin/env bash
# The one check. Green means mergeable. Runs the same locally and in CI.
set -euo pipefail
cd "$(dirname "$0")/.."
echo "== secrets";   ! grep -rEn "service_role|sb_secret_|SUPABASE_SERVICE" site data test 2>/dev/null || { echo "service key text found"; exit 1; }
echo "== emojis";    ! grep -rPn "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" site data README.md 2>/dev/null || { echo "emoji found"; exit 1; }
echo "== data";      node scripts/seed-sql.mjs > /dev/null && node -e "
const fs=require('fs');const csv=f=>{const [h,...r]=fs.readFileSync('data/'+f,'utf8').trim().split('\n');const c=h.split(',');return r.map(x=>Object.fromEntries(x.split(',').map((v,i)=>[c[i],v])))};
const C=new Set(csv('candidates.csv').map(c=>c.id)),R=new Set(csv('rounds.csv').map(r=>r.id));let bad=0;
for(const m of csv('matchups.csv')){for(const k of ['a_id','b_id'])if(!C.has(m[k])){console.error('matchup '+m.id+' unknown '+k+' '+m[k]);bad++}if(!R.has(m.round_id)){console.error('matchup '+m.id+' unknown round');bad++}if(m.a_id===m.b_id){console.error('matchup '+m.id+' self');bad++}}
for(const r of csv('rounds.csv'))if(Date.parse(r.closes_at)<=Date.parse(r.opens_at)){console.error('round '+r.id+' closes before it opens');bad++}
if(bad)process.exit(1);console.log('data ok')"
echo "== html";      node -e "const s=require('fs').readFileSync('site/vote/index.html','utf8');const o=(s.match(/<div\b/g)||[]).length,c=(s.match(/<\/div>/g)||[]).length;if(o!==c){console.error('div mismatch',o,c);process.exit(1)};console.log('html ok')"
echo "== smoke";     [ -d node_modules/playwright ] || npm i --no-save --silent --no-audit --no-fund playwright@1.49.1 >/dev/null; node test/smoke.mjs
echo "== all green"
