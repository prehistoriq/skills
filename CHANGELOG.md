# Changelog

Releases are git tags. Install one with `npx skills@1 add 'prehistoriq/skills#<tag>'`.

## Unreleased

`prq` decides what is shared. Our skills only point at it.

### Skills

- `prehistoriq`. The bridge skill is now a short reference to `prq areas`, `prq areas --skill <name>`, `prq guide <area>` and `prq share`. It says that `prq`'s output wins over the skill. It no longer lists areas, bound skills or format rules.

### Needs

- A prq CLI whose `areas --skill` prints what to do and whose `share --skill` skips with `not_bound`.

## 0.2.0

Our skills no longer share by themselves. They follow the same area rule as any skill bound to an area.

### Skills

- `show-me-pr`. The **Share** section is gone. The skill ends by telling the user where `overview.md` is.
- `review-anvil-pr`. The **Share with prehistoriq** paragraph is replaced by a **Final report** note. It says the report is final before `post` deletes it. `skills/review-anvil/SOURCE.md` lists the edit.
- `prehistoriq`. The bridge skill shares Markdown that is in no file with `prehistoriq share <area> -`, and only a skill's final result.

### Guides

- Both guides show `prehistoriq share <area> -`, which reads the Markdown from stdin.
- The overview guide says stdin can't carry images, and to share an overview with images from its own folder.

### Needs

- prehistoriq CLI 0.8.1 or later, whose `setup` writes the area rule and reads stdin with `share -`. With an older CLI, our skills finish without sharing.

## 0.1.0

The first release.

### Skills

- `review-anvil`. The multi-agent review engine. Copied from [mrshu/agent-skills](https://github.com/mrshu/agent-skills) at `9cb0b90ce5deaf8b8ae3c4ac70c6d269cff11413`, without `evaluations/`.
- `review-anvil-pr`, `review-anvil-readonly` and `review-anvil-improve-pr`. The engine's presets, copied at the same commit. `review-anvil-pr` is bound to the `findings` area. It shares its report with `prehistoriq share findings` before it posts the PR comment. `skills/review-anvil/SOURCE.md` lists every local edit.
- `show-me-pr`. Explains a PR as one `overview.md` with four perspectives, each drawn as a Mermaid diagram. It is bound to the `overview` area and shares with `prehistoriq share overview`. Adapted from HumanLayer's show-me, MIT.
- `prehistoriq`. The bridge skill. It turns any skill's output into an area's format and shares it. Sharing never fails the user's task.

### Guides

- `skills/prehistoriq/guides/findings.md` defines the findings contract. It covers the finding marker, the `scope` field, the context line and the three levels.
- `skills/prehistoriq/guides/overview.md` defines the overview contract. It has two levels and no required structure.
- Both are the same text `prehistoriq guide <area>` prints. The bridge skill reads them when the CLI is missing.

### If you used show-me-pr before

The earlier show-me-pr lived in `skills/show-me-pr` of prehistoriq/prehistoriq. The prehistoriq worker ran it for the Chunks tab, which is retired. Its `plugin.json` also said 0.1.0, but it is a different skill.

- It took an `output_path` and wrote one JSON object of four chunks. It now writes Markdown.
- The output is `.show-me-pr/overview.md` at the repository root, unless you name another directory. The directory also holds any images the overview links.
- `overview.md` starts with frontmatter and has four sections, one Mermaid diagram each.
- It shares the overview itself when the prehistoriq CLI is installed.
- Remove any copy of the old skill and install this one with `npx skills add`.
