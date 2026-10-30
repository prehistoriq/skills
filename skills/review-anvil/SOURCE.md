# Source of the review-anvil skills

The four review-anvil skills in this repo are a copy. They are not maintained here.

| Field | Value |
| --- | --- |
| Repo | [mrshu/agent-skills](https://github.com/mrshu/agent-skills) |
| Path | `plugins/review-anvil/skills` |
| SHA | `9cb0b90ce5deaf8b8ae3c4ac70c6d269cff11413` |
| Skills | `review-anvil`, `review-anvil-pr`, `review-anvil-readonly`, `review-anvil-improve-pr` |

## Permission

The upstream repo has no license file. mrshu owns it and is a prehistoriq owner. mrshu approved this copy for `prehistoriq/skills`.

## What was left out

- `review-anvil/evaluations/`. Nothing reads it at runtime.
- Everything outside `plugins/review-anvil/skills` in the upstream repo.

## Local edits

Every file not listed here is byte-identical to the upstream file at the SHA above.

1. `review-anvil-pr/SKILL.md`. Two lines added to the frontmatter, after `description`.

   ```yaml
   metadata:
     prehistoriq-area: findings
   ```

   This binds the preset to the prehistoriq findings area.

2. `review-anvil-pr/SKILL.md`. A **Final report** paragraph at the end of step 3, before step 4. It says that `<REPORT_PATH>` and its `.context.json` hold the final report there, and that step 4 deletes both on success. The area rule that `prq setup` writes shares the final result, and this tells the agent to read it before `post` removes it. Until 0.2.0 this paragraph ran `prehistoriq share findings` itself.

## Known upstream text

Some text still points at the upstream repo. It is left as is to keep the copy minimal.

- Install hints say `npx skills add mrshu/agent-skills`. That command still works, but it installs the upstream copy, not this one.
- Report footers link to `https://github.com/mrshu/agent-skills/#review-anvil`.

## Updating

1. Run `node scripts/check-skills.mjs --drift`. It reports whether upstream has new commits under the path above.
2. Copy the path again at the new SHA, without `evaluations/`.
3. Reapply the local edits above, then update the SHA in this file. The drift check reads it from here.
