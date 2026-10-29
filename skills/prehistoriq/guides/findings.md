# The findings area

The findings area holds code review findings for a pull request. prehistoriq shows each finding next to the code it is about, on the PR's Findings tab.

Write one Markdown file. Share it with `prehistoriq share findings <file>`, or pipe the Markdown into `prehistoriq share findings -`.

## Levels

The contract has three levels. Each one is optional on top of the one before it.

1. **Plain.** Any Markdown file. It needs a title, from a `title` frontmatter field or the first heading. prehistoriq shows it as a document and finds no rows.
2. **Described.** Frontmatter adds a `summary` of one or two sentences. The body may link images with relative paths. Each linked local file uploads with the document.
3. **Structured.** Each finding has a marker line, then a heading and its text, then a context line. prehistoriq turns each one into a row shown with its code.

Write the structured level whenever you can. The other levels exist so that any review can still be shared.

Every relative link uploads as a file, so link only images. A relative link to a source file, such as `[sync](src/sync.ts)`, is not an asset, and `share` rejects it as `unsupported_asset`. Cite source code as inline code with a path and a line range, as in `src/sync.ts:40-52`, or put it in a context line.

## A structured finding

```markdown
<!-- prehistoriq:finding key=F001 severity=high kind=issue scope=backend path=src/sync.ts lines=40-52 -->

### Retry loop never backs off

`refetchStale` retries immediately on 429, so one throttled repo burns the whole budget.

**Fix:** reuse `backoff()` from `_shared/github.ts`.

<!-- prehistoriq:context {"items":[{"kind":"file","label":"backoff helper","path":"supabase/functions/_shared/github.ts","lines":[[88,104]]},{"kind":"file","label":"caller loop","path":"supabase/functions/_shared/sync.ts","lines":[[12,30],[61,70]]}]} -->
```

The parts, in order.

1. The marker line. One HTML comment on its own line.
2. A heading that states the problem. Any level from `##` to `####`.
3. The text. What is wrong and why it matters, in plain sentences.
4. An optional `**Fix:**` paragraph with the suggested change.
5. The context line. One HTML comment on its own line.

A finding ends at the next marker line or the end of the file.

## Marker fields

Fields are `name=value` pairs separated by spaces. Values contain no spaces. Write a space in a path as `%20`.

| Field | Required | Value |
| --- | --- | --- |
| `key` | yes | A stable id, unique in the file. Letters, digits, `_`, `.`, `:` and `-`, up to 200 characters. Example `F001`. |
| `severity` | yes | `critical`, `high`, `medium`, `low` or `nit`. |
| `kind` | yes | `issue` (must fix), `suggestion` (worth doing) or `deferred` (real, but out of scope for this PR). |
| `scope` | no | The code area the finding is in, as one word. Examples `backend`, `frontend`, `data`, `devops`, `tests`. |
| `path` | yes | The file the finding is anchored to, relative to the repository root. |
| `lines` | yes | The anchor span in that file, as `start-end`. Lines are 1-based and inclusive. A single line is `40-40`. |

`scope` is not called `area`, because an area in prehistoriq means a kind of content such as findings or overview.

Read the anchor span at the commit you reviewed before you write it. prehistoriq always shows the anchor's code.

## Context line

Give every finding a context line. It lists the other places that cause the finding or are affected by it. A reader opens them next to the anchor to retrace your reasoning. When nothing else is relevant, write `{"items":[]}`.

The line is `<!-- prehistoriq:context ` then one JSON object then ` -->`. The object has one field, `items`, a list of at most 8 items. Each item is one of two kinds.

A file item.

| Field | Required | Value |
| --- | --- | --- |
| `kind` | yes | `"file"` |
| `label` | yes | What this place is, one line of at most 80 characters. |
| `path` | yes | Relative to the repository root. No leading `/` or `-`, no `..`, no `.git`, no backslashes. |
| `lines` | yes | A list of at most 20 spans, each `[start, end]`, 1-based and inclusive. `[]` means the whole file. |
| `repo` | no | Another repository, as `owner/name`. Then `commit` is required. |
| `commit` | no | The full 40-character commit the file was read at. Required with `repo`. |

A pull request item.

| Field | Required | Value |
| --- | --- | --- |
| `kind` | yes | `"pr"` |
| `label` | yes | What this PR is, one line of at most 80 characters. |
| `number` | yes | The PR number, a positive integer. |
| `repo` | no | Another repository, as `owner/name`. Without it the PR is in this repository. |

```markdown
<!-- prehistoriq:context {"items":[{"kind":"file","label":"token check in the shared client","path":"src/auth/client.ts","lines":[[14,31]]},{"kind":"pr","label":"PR that added the refresh path","number":412}]} -->
```

The JSON must not contain two hyphens in a row, because `--` can end the HTML comment early. Write a hyphen as `\u002d` where that would happen. It is still valid JSON.

prehistoriq checks each item when you share. It reads every same-repository file at the shared commit and keeps the spans that exist. An item that fails a check is dropped with a warning. It never fails the share.

## Review summary

Text before the first marker is the review summary. Start the file with a `# ` heading or a `title` in frontmatter, then a short summary of the review.

```markdown
---
title: Review of the sync retry change
summary: One high issue in the retry loop. Two suggestions on naming.
---

# Review of the sync retry change

The change is close. The retry loop needs a backoff before it ships.
```

## review-anvil reports

A report from the review-anvil skills is accepted as written. Its `review-anvil-report:` marker lines and `review-anvil: context=` lines are a second accepted dialect. Do not convert them.

## Sharing

```bash
prehistoriq share findings review.md
cat review.md | prehistoriq share findings -
```

`share` attaches the file to the current `HEAD` commit, and through it to the PR. It prints one line that says what happened. `-` reads the Markdown from stdin, so no file lands in the repository. Only the file form reads a review-anvil report's `.context.json` next to it.

| Exit | Meaning | What to do |
| --- | --- | --- |
| 0 | Stored, drafted, staged, a duplicate, or skipped because you are not signed in | Relay the line. |
| 1 | A transient failure | Run it once more. |
| 2 | The file breaks this contract | Fix what the line names and share again. |

When your harness does not set a session variable, add `--model <model id>` and `--skill <skill name>` so the version records who wrote it.

Sharing must never fail the user's task. When `prehistoriq` is not on PATH or `share` keeps failing, finish the task and say that sharing was skipped and why.
