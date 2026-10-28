#!/usr/bin/env node
// Checks every skill's frontmatter and the area guides' examples.
// `--drift` also asks GitHub whether the review-anvil upstream moved past the pinned SHA.
// With PREHISTORIQ_CLI=<path to cli.mjs>, every complete guide example must pass `share --dry-run`.

import { execFileSync, spawnSync } from "node:child_process"
import { readFileSync, readdirSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const skillsDir = join(root, "skills")

const AREAS = ["findings", "overview"]

// Every skill in skills/ must be listed, with the area it declares or null.
const EXPECTED = {
  "show-me-pr": "overview",
  "review-anvil-pr": "findings",
  "review-anvil": null,
  "review-anvil-readonly": null,
  "review-anvil-improve-pr": null,
  prehistoriq: null,
}

const SEVERITIES = ["critical", "high", "medium", "low", "nit"]
const KINDS = ["issue", "suggestion", "deferred"]
const MARKER_FIELDS = { key: true, severity: true, kind: true, scope: false, path: true, lines: true }

const errors = []
const fail = (where, msg) => errors.push(`${where}: ${msg}`)

function scalar(raw, where) {
  const v = raw.trim()
  if (v.startsWith("'")) {
    if (!/^'(?:[^']|'')*'$/.test(v)) throw new Error(`${where}: bad single-quoted value`)
    return v.slice(1, -1).replace(/''/g, "'")
  }
  if (v.startsWith('"')) return JSON.parse(v)
  if (/^[>|]/.test(v) || v === "") throw new Error(`${where}: block or empty values are not supported`)
  return v
}

// A YAML subset: top-level `key: scalar` and one level of `key:` maps.
// Anything else throws, so an unexpected shape fails loudly.
function frontmatter(text, where) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/)
  if (!m) throw new Error(`${where}: no frontmatter`)
  const out = {}
  let map = null
  for (const [i, line] of m[1].split("\n").entries()) {
    const at = `${where}:${i + 2}`
    if (!line.trim()) continue
    const nested = line.match(/^ {2}([\w-]+):\s*(.*)$/)
    const top = line.match(/^([\w-]+):\s*(.*)$/)
    if (nested && map) map[nested[1]] = scalar(nested[2], at)
    else if (top && top[2] === "") map = out[top[1]] = {}
    else if (top) {
      out[top[1]] = scalar(top[2], at)
      map = null
    } else throw new Error(`${at}: unsupported frontmatter line ${JSON.stringify(line)}`)
  }
  return out
}

function checkSkill(name) {
  const where = `skills/${name}/SKILL.md`
  const file = join(skillsDir, name, "SKILL.md")
  if (!existsSync(file)) return fail(where, "missing")
  let fm
  try {
    fm = frontmatter(readFileSync(file, "utf8"), where)
  } catch (e) {
    return fail(where, e.message)
  }
  if (fm.name !== name) fail(where, `name is ${JSON.stringify(fm.name)}, expected ${JSON.stringify(name)}`)
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) fail(where, "name must be lowercase words joined by hyphens")
  if (typeof fm.description !== "string" || !fm.description.trim()) fail(where, "description is missing")
  else if (fm.description.length > 1024) fail(where, `description is ${fm.description.length} characters, over 1024`)
  const area = fm.metadata?.["prehistoriq-area"] ?? null
  const expected = EXPECTED[name]
  if (area !== expected) fail(where, `metadata.prehistoriq-area is ${JSON.stringify(area)}, expected ${JSON.stringify(expected)}`)
  if (area !== null && !AREAS.includes(area)) fail(where, `unknown area ${JSON.stringify(area)}`)
}

function checkContextItem(item, at) {
  const label = typeof item?.label === "string" ? item.label.trim() : ""
  if (!label) return fail(at, "context item needs a label")
  if (label.length > 80 || /[\x00-\x1f\x7f]/.test(label)) fail(at, `label "${label}" must be one line of at most 80 characters`)
  if (item.repo !== undefined && !/^[\w.-]{1,100}\/[\w.-]{1,100}$/.test(item.repo)) fail(at, `bad repo ${item.repo}`)
  if (item.kind === "pr") {
    if (!Number.isSafeInteger(item.number) || item.number < 1) fail(at, `PR "${label}" needs a positive number`)
    return
  }
  if (item.kind !== "file") return fail(at, `unknown kind ${JSON.stringify(item.kind)}`)
  const p = item.path
  if (typeof p !== "string" || !p || /^[/-]/.test(p) || p.includes("\\") || p.split("/").some((s) => !s || s === "." || s === ".." || s === ".git"))
    fail(at, `file "${label}" has an invalid path`)
  if (!Array.isArray(item.lines) || item.lines.length > 20) return fail(at, `file "${label}" needs at most 20 spans`)
  for (const s of item.lines)
    if (!Array.isArray(s) || s.length !== 2 || !s.every(Number.isSafeInteger) || s[0] < 1 || s[1] < s[0])
      fail(at, `file "${label}" has a bad span ${JSON.stringify(s)}`)
  if (item.commit !== undefined && !/^[0-9a-f]{40}$/.test(item.commit)) fail(at, `file "${label}" needs a 40-character commit`)
  if (item.repo !== undefined && item.commit === undefined) fail(at, `file "${label}" in ${item.repo} needs its commit`)
}

// Guides are printed by `prehistoriq guide`, outside this repo, so they may not link to local files.
function checkGuide(area) {
  const where = `skills/prehistoriq/guides/${area}.md`
  const file = join(skillsDir, "prehistoriq", "guides", `${area}.md`)
  if (!existsSync(file)) return fail(where, "missing")
  const text = readFileSync(file, "utf8")
  let markers = 0
  let fence = null
  for (const [i, line] of text.split("\n").entries()) {
    const at = `${where}:${i + 1}`
    const f = line.match(/^\s*(`{3,}|~{3,})(.*)$/)
    if (f && !fence) fence = f[1]
    else if (f && f[1][0] === fence[0] && f[1].length >= fence.length && !f[2].trim()) fence = null
    else if (!fence)
      for (const [, target] of line.replace(/`[^`]*`/g, "").matchAll(/\]\(([^)\s]+)/g))
        if (!/^(https?:|mailto:|#)/.test(target)) fail(at, `relative link ${target}; guides must be self-contained`)
    const marker = line.match(/^<!-- prehistoriq:finding (.*) -->$/)
    if (marker) {
      markers++
      const fields = Object.fromEntries(marker[1].split(/\s+/).map((kv) => kv.split("=")))
      for (const [k, required] of Object.entries(MARKER_FIELDS)) if (required && !fields[k]) fail(at, `marker lacks ${k}`)
      for (const k of Object.keys(fields)) if (!(k in MARKER_FIELDS)) fail(at, `marker has unknown field ${k}`)
      if (fields.key && !/^[\w.:-]{1,200}$/.test(fields.key)) fail(at, `bad key ${fields.key}`)
      if (fields.severity && !SEVERITIES.includes(fields.severity)) fail(at, `bad severity ${fields.severity}`)
      if (fields.kind && !KINDS.includes(fields.kind)) fail(at, `bad kind ${fields.kind}`)
      const span = fields.lines?.match(/^(\d+)-(\d+)$/)
      if (fields.lines && (!span || +span[1] < 1 || +span[2] < +span[1])) fail(at, `bad lines ${fields.lines}`)
    }
    const context = line.match(/^<!-- prehistoriq:context (.*) -->$/)
    if (context) {
      if (context[1].includes("--")) fail(at, "context JSON contains --, which can close the comment")
      let value
      try {
        value = JSON.parse(context[1])
      } catch (e) {
        fail(at, `context is not JSON: ${e.message}`)
        continue
      }
      if (!Array.isArray(value?.items)) fail(at, "context needs an items list")
      else if (value.items.length > 8) fail(at, "context has more than 8 items")
      else value.items.forEach((item) => checkContextItem(item, at))
    }
  }
  if (area === "findings" && markers === 0) fail(where, "has no finding marker example")
}

// Fenced `markdown` blocks with a title (a heading or frontmatter); fragments without one are skipped.
function examples(text) {
  const out = []
  let open = null
  for (const [i, line] of text.split("\n").entries()) {
    const f = line.match(/^(`{3,}|~{3,})(.*)$/)
    if (!open && f) open = { fence: f[1], lang: f[2].trim(), line: i + 2, body: [] }
    else if (open && f && f[1][0] === open.fence[0] && f[1].length >= open.fence.length && !f[2].trim()) {
      const body = open.body.join("\n")
      if (open.lang === "markdown" && /^(---\ntitle:|#{1,6} )/m.test(body)) out.push({ line: open.line, body })
      open = null
    } else if (open) open.body.push(line)
  }
  return out
}

function checkExamples(cli, area) {
  const where = `skills/prehistoriq/guides/${area}.md`
  const dir = mkdtempSync(join(tmpdir(), "check-skills-"))
  const env = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_AUTHOR_NAME: "c", GIT_AUTHOR_EMAIL: "c@example.invalid", GIT_COMMITTER_NAME: "c", GIT_COMMITTER_EMAIL: "c@example.invalid" }
  execFileSync("git", ["init", "-q"], { cwd: dir, env })
  execFileSync("git", ["commit", "-q", "--allow-empty", "-m", "empty"], { cwd: dir, env })
  const found = examples(readFileSync(join(skillsDir, "prehistoriq", "guides", `${area}.md`), "utf8"))
  console.log(`examples: ${where} has ${found.length}, each checked with share --dry-run`)
  for (const ex of found) {
    const file = join(dir, `example-${ex.line}.md`)
    writeFileSync(file, `${ex.body}\n`)
    // Linked images in an example stand for files the author would have; give each a stub.
    for (const [, target] of ex.body.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) {
      mkdirSync(dirname(join(dir, target)), { recursive: true })
      writeFileSync(join(dir, target), "<svg xmlns='http://www.w3.org/2000/svg'/>")
    }
    const run = spawnSync(process.execPath, [cli, "share", area, file, "--dry-run"], { cwd: dir, env, encoding: "utf8" })
    if (run.status !== 0) fail(`${where}:${ex.line}`, `example fails share --dry-run (exit ${run.status}): ${(run.stderr || run.stdout).trim()}`)
  }
}

async function drift() {
  const source = readFileSync(join(skillsDir, "review-anvil", "SOURCE.md"), "utf8")
  const field = (name) => source.match(new RegExp(`^\\| ${name} \\| \`?([^|\`]+?)\`? \\|$`, "m"))?.[1]
  const repo = source.match(/^\| Repo \| \[([\w.-]+\/[\w.-]+)\]/m)?.[1]
  const path = field("Path")
  const sha = field("SHA")
  if (!repo || !path || !/^[0-9a-f]{40}$/.test(sha ?? "")) {
    fail("skills/review-anvil/SOURCE.md", "needs Repo, Path and SHA rows")
    return
  }
  const url = `https://api.github.com/repos/${repo}/commits?path=${encodeURIComponent(path)}&per_page=1`
  const headers = { accept: "application/vnd.github+json", "user-agent": "prehistoriq-check-skills" }
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  let latest
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    latest = (await res.json())[0]?.sha
  } catch (e) {
    console.log(`drift: skipped, could not reach GitHub (${e.message})`)
    return
  }
  if (!latest) console.log(`drift: skipped, GitHub returned no commits for ${repo}/${path}`)
  else if (latest === sha) console.log(`drift: current, ${repo}/${path} last changed at the pinned ${sha.slice(0, 7)}`)
  else fail("drift", `${repo}/${path} changed at ${latest.slice(0, 7)}, pinned ${sha.slice(0, 7)}. See skills/review-anvil/SOURCE.md.`)
}

const found = readdirSync(skillsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(skillsDir, d.name, "SKILL.md")))
  .map((d) => d.name)
for (const name of found) if (!(name in EXPECTED)) fail(`skills/${name}`, "not listed in EXPECTED in scripts/check-skills.mjs")
for (const name of Object.keys(EXPECTED)) checkSkill(name)
for (const area of AREAS) checkGuide(area)
if (process.env.PREHISTORIQ_CLI) for (const area of AREAS) checkExamples(process.env.PREHISTORIQ_CLI, area)
else console.log("examples: skipped, set PREHISTORIQ_CLI to a prehistoriq cli.mjs to run share --dry-run on them")
if (process.argv.includes("--drift")) await drift()

if (errors.length) {
  for (const e of errors) console.error(`error ${e}`)
  process.exit(1)
}
console.log(`ok: ${Object.keys(EXPECTED).length} skills, ${AREAS.length} guides`)
