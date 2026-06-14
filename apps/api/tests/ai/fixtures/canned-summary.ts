// Pinned "good" AI output for the eval harness.
//
// These shapes mimic what GPT-4o produces for the short-script fixture. The
// eval tests compare *new* runs (or, in CI, a deterministic mocked run)
// against these fixtures so we catch prompt regressions early — drop in
// character count, missing stunt scene, budget total drift, etc.

import type {
  AICharacter,
  AIScene,
  AIDepartment,
  AIBudgetLine,
  AIScriptSummary,
} from '../../../src/ai/schemas.js';

const characters: AICharacter[] = [
  { name: 'Rajesh', importance: 'LEAD', estimatedScreenTimeMinutes: 45, notes: 'Lead lawyer protagonist' },
  { name: 'Anjali', importance: 'LEAD', estimatedScreenTimeMinutes: 35, notes: 'Junior lawyer / co-lead' },
  { name: 'Inspector Kumar', importance: 'SUPPORT', estimatedScreenTimeMinutes: 12, notes: 'Investigating officer' },
  { name: 'Mohan', importance: 'SUPPORT', estimatedScreenTimeMinutes: 8, notes: 'Witness' },
  { name: 'Meera', importance: 'SUPPORT', estimatedScreenTimeMinutes: 6, notes: 'Judge' },
];

const scenes: AIScene[] = [
  {
    sceneNumber: '1',
    heading: 'INT. CHENNAI CAFE - DAY',
    synopsis: 'Rajesh and Anjali set up the missing-witness problem.',
    locationType: 'INTERIOR',
    timeOfDay: 'DAY',
    locationName: 'Chennai Cafe',
    estimatedPages: 1.5,
    charactersPresent: ['Rajesh', 'Anjali'],
    hasStunts: false,
    hasVFX: false,
    hasSong: false,
  },
  {
    sceneNumber: '2',
    heading: 'EXT. HIGH COURT STEPS - DAY',
    synopsis: 'Reporters mob Rajesh; Kumar pulls him aside.',
    locationType: 'EXTERIOR',
    timeOfDay: 'DAY',
    locationName: 'High Court',
    estimatedPages: 1,
    charactersPresent: ['Rajesh', 'Inspector Kumar'],
    hasStunts: false,
    hasVFX: false,
    hasSong: false,
  },
  {
    sceneNumber: '3',
    heading: 'INT. WAREHOUSE - NIGHT',
    synopsis: 'Action sequence: bullets, wounded witness extraction.',
    locationType: 'INTERIOR',
    timeOfDay: 'NIGHT',
    locationName: 'Abandoned Warehouse',
    estimatedPages: 3,
    charactersPresent: ['Rajesh', 'Anjali', 'Mohan'],
    hasStunts: true,
    hasVFX: false,
    hasSong: false,
  },
  {
    sceneNumber: '4',
    heading: 'EXT. MARINA BEACH - DUSK',
    synopsis: 'Lyrical song sequence on the beach.',
    locationType: 'EXTERIOR',
    timeOfDay: 'DUSK',
    locationName: 'Marina Beach',
    estimatedPages: 2,
    charactersPresent: ['Rajesh', 'Anjali'],
    hasStunts: false,
    hasVFX: false,
    hasSong: true,
  },
  {
    sceneNumber: '5',
    heading: 'INT. COURTROOM - DAY',
    synopsis: 'Verdict scene with VFX lighting reveal.',
    locationType: 'INTERIOR',
    timeOfDay: 'DAY',
    locationName: 'Courtroom',
    estimatedPages: 2.5,
    charactersPresent: ['Rajesh', 'Anjali', 'Meera'],
    hasStunts: false,
    hasVFX: true,
    hasSong: false,
  },
];

const departments: AIDepartment[] = [
  { kind: 'DIRECTION', displayName: 'Direction', required: true, reasoning: 'Every project needs direction' },
  { kind: 'PRODUCTION', displayName: 'Production', required: true, reasoning: 'Coordinator hub' },
  { kind: 'DOP_CAMERA', displayName: 'DOP / Camera', required: true, reasoning: 'Cinematography' },
  { kind: 'ART', displayName: 'Art', required: true, reasoning: 'Set design needed' },
  { kind: 'COSTUME', displayName: 'Costume', required: true, reasoning: 'Court / casual wardrobe' },
  { kind: 'MAKEUP_HAIR', displayName: 'Makeup & Hair', required: true, reasoning: 'Continuity' },
  { kind: 'STUNTS', displayName: 'Stunts', required: true, reasoning: 'Warehouse action scene' },
  { kind: 'VFX', displayName: 'VFX', required: true, reasoning: 'Courtroom lighting reveal' },
  { kind: 'SOUND', displayName: 'Sound', required: true, reasoning: 'Production sound' },
  { kind: 'MUSIC', displayName: 'Music', required: true, reasoning: 'Song sequence' },
  { kind: 'CASTING', displayName: 'Casting', required: true, reasoning: 'Lead + 3 support' },
  { kind: 'EDITORIAL', displayName: 'Editorial', required: false, reasoning: 'Post phase' },
];

const budgetLines: AIBudgetLine[] = [
  { department: 'DIRECTION', label: "Director's fee", amountINR: 2_500_000, notes: null },
  { department: 'PRODUCTION', label: 'Line producer + UPM', amountINR: 1_800_000, notes: null },
  { department: 'CASTING', label: 'Lead cast fees', amountINR: 9_000_000, notes: null },
  { department: 'DOP_CAMERA', label: 'DOP package + 8 days', amountINR: 3_200_000, notes: null },
  { department: 'ART', label: 'Court + warehouse build', amountINR: 1_500_000, notes: null },
  { department: 'COSTUME', label: 'Hero + supporting wardrobe', amountINR: 600_000, notes: null },
  { department: 'STUNTS', label: 'Stunt coordinator + warehouse day', amountINR: 1_200_000, notes: null },
  { department: 'VFX', label: 'Courtroom VFX shots', amountINR: 1_000_000, notes: null },
  { department: 'MUSIC', label: 'Song composition + 2 days shoot', amountINR: 1_800_000, notes: null },
  { department: 'SOUND', label: 'Production sound + sync', amountINR: 500_000, notes: null },
  { department: 'MAKEUP_HAIR', label: 'Hair + makeup team', amountINR: 400_000, notes: null },
  { department: 'EDITORIAL', label: 'Editor + DI', amountINR: 1_500_000, notes: null },
];

export const cannedSummary: AIScriptSummary = {
  characters: { characters },
  scenes: { scenes },
  combinations: {
    groups: [
      {
        groupLabel: 'Rajesh + Anjali backbone',
        characters: ['Rajesh', 'Anjali'],
        sceneNumbers: ['1', '3', '4', '5'],
        estimatedDaysIfShotTogether: 4,
        estimatedDaysIfShotSeparately: 6,
        notes: 'Both leads in 4/5 scenes — anchor schedule on them.',
      },
    ],
    totalEstimatedSavingsDays: 2,
  },
  departments: { departments },
  shootDays: {
    perActor: [
      { character: 'Rajesh', sceneCount: 5, estimatedDays: 5, notes: 'In every scene' },
      { character: 'Anjali', sceneCount: 4, estimatedDays: 4, notes: 'Most days' },
      { character: 'Inspector Kumar', sceneCount: 1, estimatedDays: 1, notes: null },
      { character: 'Mohan', sceneCount: 1, estimatedDays: 1, notes: null },
      { character: 'Meera', sceneCount: 1, estimatedDays: 1, notes: null },
    ],
    totalShootDaysEstimate: 7,
    optimizationHints: [
      'Group warehouse + courtroom around lead availability windows',
      'Schedule song sequence on a single dusk shoot day',
    ],
  },
  budget: {
    lines: budgetLines,
    totalINR: budgetLines.reduce((sum, l) => sum + l.amountINR, 0),
    confidence: 'MEDIUM',
    caveats: [
      'Stunt insurance not yet quoted',
      'VFX scope assumes 5-10 shots',
    ],
  },
};
