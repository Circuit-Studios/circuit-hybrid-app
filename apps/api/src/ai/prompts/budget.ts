import type { AIDepartment, AICombinationGroup } from '../schemas.js';
import type { z } from 'zod';
import { aiShootDaysResponseSchema } from '../schemas.js';

type ShootDays = z.infer<typeof aiShootDaysResponseSchema>;

export function buildBudgetPrompt(opts: {
  projectGenre: string;
  projectLanguage: string;
  budgetMinINR: number | null;
  budgetMaxINR: number | null;
  departments: AIDepartment[];
  shootDays: ShootDays;
  combinations: AICombinationGroup[];
}): string {
  const hintRange =
    opts.budgetMinINR && opts.budgetMaxINR
      ? `${(opts.budgetMinINR / 1e7).toFixed(2)}-${(opts.budgetMaxINR / 1e7).toFixed(2)} crore INR`
      : 'not provided by user';

  return `Genre: ${opts.projectGenre}
Language: ${opts.projectLanguage}
Director's budget hint: ${hintRange}
Total shoot days estimate: ${opts.shootDays.totalShootDaysEstimate}
Required departments: ${opts.departments
    .filter(d => d.required)
    .map(d => d.kind)
    .join(', ')}

TASK: Draft a department-wise budget. Allocate INR amounts to each REQUIRED
department from the list above. Respect Indian-industry-standard ratios:
  - Cast (Production line item "Cast Fees"): 30-45% of total
  - Production overhead (Production): 12-18%
  - DOP / Camera (DOP_CAMERA): 8-12%
  - Art: 5-10%
  - Costume: 3-6%
  - Makeup/Hair: 2-4%
  - Stunts (only if present): 3-15% based on intensity
  - VFX (only if present): 3-30% based on intensity
  - Sound: 2-4%
  - Music: 3-8%
  - Location: 3-8%
  - Editorial: 2-4%
  - Post DI: 1-3%
  - Post Sound: 1-3%

If the director's hint range is given, total should fall WITHIN that range.
If not, choose a realistic total for the genre and shoot-day count.

For each line:
- label: a producer-friendly description, e.g. "Camera equipment + crew (8% of total)".
- amountINR: integer amount in rupees (NOT crore).
- notes: optional 1-sentence justification.

confidence: HIGH if the director provided a budget hint AND the genre is
well-understood; MEDIUM otherwise; LOW if hint is missing AND the script has
many specialised elements (stunts, VFX, big song-and-dance).
caveats: 2-5 risks ("VFX could double if the action climax goes to 200 shots").`;
}
