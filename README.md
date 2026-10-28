# skills

Agent skills for [prehistoriq](https://github.com/prehistoriq/prehistoriq) areas. An area is one kind of data point a pull request can carry. Each area has a default skill here whose output prehistoriq accepts as is.

```bash
npx skills add prehistoriq/skills
```

## Areas

| Area | Default skill | What it writes |
| --- | --- | --- |
| `findings` | `review-anvil-pr` | A review report whose findings prehistoriq shows next to their code |
| `overview` | `show-me-pr` | `overview.md` with four perspectives on the PR, drawn as Mermaid diagrams |

A skill declares its area in its frontmatter with `metadata.prehistoriq-area`.

## Skills

| Skill | Purpose |
| --- | --- |
| `show-me-pr` | Explains a PR as one Markdown overview. Adapted from HumanLayer's show-me, MIT. |
| `prehistoriq` | The bridge skill. It turns any skill's output into an area's format and shares it. |
| `review-anvil-pr` | Reviews a GitHub PR with several agents and posts the report as a PR comment. |
| `review-anvil` | The review engine the presets run. |
| `review-anvil-readonly` | Reviews a diff, branch or path without editing anything. |
| `review-anvil-improve-pr` | Reviews a checked-out PR, commits fixes and pushes them. |

The review-anvil skills are copied from [mrshu/agent-skills](https://github.com/mrshu/agent-skills) with the owner's approval. `skills/review-anvil/SOURCE.md` records the pinned commit and every local edit.

The area guides live in `skills/prehistoriq/guides/`. They are the same text `prehistoriq guide <area>` prints.

## Sharing

The skills share their output with `prehistoriq share` when the prehistoriq CLI is installed. When it is not, they finish their task and say that sharing was skipped.

## Local testing

Install from a local clone into a throwaway home, so your real skill dirs stay untouched.

```bash
export HOME=$(mktemp -d)
npx skills add /path/to/skills -g -a claude-code -y
ls -la ~/.claude/skills ~/.agents/skills
npx skills remove -g -y --all
```

Check the frontmatter and the guide examples before you open a PR. CI runs the same command.

```bash
node scripts/check-skills.mjs
node scripts/check-skills.mjs --drift   # maintainers: has review-anvil moved upstream?
```
