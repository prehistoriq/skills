# skills

Agent skills for [prehistoriq](https://github.com/prehistoriq/prehistoriq) areas. An area is one kind of data point a pull request can carry. Each area has a default skill here whose output prehistoriq accepts as is.

```bash
npx skills add prehistoriq/skills
```

Install a release by its tag. [CHANGELOG.md](CHANGELOG.md) lists the releases.

```bash
npx skills@1 add 'prehistoriq/skills#v0.2.0'
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
| `prehistoriq` | A reference to the `prq` commands that say what is shared, in which format, and share it. |
| `review-anvil-pr` | Reviews a GitHub PR with several agents and posts the report as a PR comment. |
| `review-anvil` | The review engine the presets run. |
| `review-anvil-readonly` | Reviews a diff, branch or path without editing anything. |
| `review-anvil-improve-pr` | Reviews a checked-out PR, commits fixes and pushes them. |

The review-anvil skills are copied from [mrshu/agent-skills](https://github.com/mrshu/agent-skills) with the owner's approval. `skills/review-anvil/SOURCE.md` records the pinned commit and every local edit.

The area formats live in prq. `prq guide <area>` prints the current one.

## Sharing

The skills here don't share anything themselves. `prq setup` binds a skill to each area, ours or anyone's, and writes a short rule into each agent tool's instructions. The rule names no skill. It asks the agent to run `prq areas --skill <name>` when a skill finishes and to do what it prints. `prq share <area> <file> --skill <name>` skips with `not_bound` when the skill isn't bound to the area, so a stale instruction can't share the wrong result. Where the tool has an end-of-turn hook, prehistoriq also reminds the agent once when a bound skill ran and nothing was shared.

## Local testing

Install from a local clone into a throwaway home. `env -i` keeps your real HOME and harness variables such as `CLAUDE_CONFIG_DIR` out of each command, so `--all` reaches only the throwaway home.

```bash
T=$(mktemp -d)
env -i HOME="$T" PATH="$PATH" npx skills add /path/to/skills -g -a claude-code codex -y
ls -la "$T/.claude/skills" "$T/.agents/skills"
env -i HOME="$T" PATH="$PATH" npx skills remove -g -y --all
```

Check the frontmatter before you open a PR. CI runs the same command.

```bash
node scripts/check-skills.mjs
node scripts/check-skills.mjs --drift   # maintainers: has review-anvil moved upstream?
```
