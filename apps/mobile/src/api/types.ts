// Types mirror the Express backend response shapes. Keep in sync manually for
// now; once we extract the backend's Zod schemas to a shared package we can
// reuse the inferred types directly.

export type UserRole =
  | 'DIRECTOR'
  | 'PRODUCER'
  | 'EXECUTIVE_PRODUCER'
  | 'LINE_PRODUCER'
  | 'AD'
  | 'DOP'
  | 'DEPT_HEAD'
  | 'CREW'
  | 'ACTOR'
  | 'VENDOR';

export type ProjectLanguage =
  | 'TELUGU'
  | 'HINDI'
  | 'TAMIL'
  | 'MALAYALAM'
  | 'KANNADA'
  | 'ENGLISH'
  | 'OTHER';

export type ProjectStage = 'PRE_PRODUCTION' | 'PRODUCTION' | 'POST_PRODUCTION';

export type ScriptAnalysisStatus =
  | 'PENDING'
  | 'EXTRACTING_TEXT'
  | 'ANALYZING_CHARACTERS'
  | 'ANALYZING_SCENES'
  | 'ANALYZING_COMBINATIONS'
  | 'SUGGESTING_DEPARTMENTS'
  | 'ESTIMATING_SHOOT_DAYS'
  | 'DRAFTING_BUDGET'
  | 'COMPLETED'
  | 'FAILED';

export interface AuthUser {
  id: string;
  phone: string | null;
  email: string | null;
  emailVerified?: boolean;
  firstName: string;
  lastName: string;
  defaultRole: UserRole;
  createdAt?: string;
}

export interface VerifyOtpResponse {
  token: string;
  expiresAt?: string;
  user: AuthUser;
}

export interface Project {
  id: string;
  name: string;
  language: ProjectLanguage;
  languages: ProjectLanguage[];
  genre: string;
  budgetMinINR: number | null;
  budgetMaxINR: number | null;
  shootStartDate: string | null;
  shootEndDate: string | null;
  currentStage: ProjectStage;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
  role?: UserRole;
}

export interface ScriptRecord {
  id: string;
  projectId: string;
  uploadedByUserId: string;
  originalFileName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number | null;
  language: string | null;
  analysisStatus: ScriptAnalysisStatus;
  analysisError: string | null;
  analysisStartedAt: string | null;
  analysisEndedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DepartmentKind =
  | 'DIRECTION'
  | 'PRODUCTION'
  | 'CASTING'
  | 'DOP_CAMERA'
  | 'ART'
  | 'COSTUME'
  | 'MAKEUP_HAIR'
  | 'STUNTS'
  | 'VFX'
  | 'SOUND'
  | 'MUSIC'
  | 'LOCATION'
  | 'EDITORIAL'
  | 'POST_DI'
  | 'POST_SOUND'
  | 'OTHER';

export interface AICharacter {
  name: string;
  importance: 'LEAD' | 'SUPPORT' | 'DAY_ROLE';
  estimatedScreenTimeMinutes: number | null;
  notes: string | null;
}

export interface AIScene {
  sceneNumber: string;
  heading: string;
  synopsis: string | null;
  locationType: 'INTERIOR' | 'EXTERIOR' | 'INT_EXT';
  timeOfDay: 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'UNSPECIFIED';
  locationName: string | null;
  estimatedPages: number | null;
  charactersPresent: string[];
  hasStunts: boolean;
  hasVFX: boolean;
  hasSong: boolean;
}

export interface AICombinationGroup {
  groupLabel: string;
  characters: string[];
  sceneNumbers: string[];
  estimatedDaysIfShotTogether: number;
  estimatedDaysIfShotSeparately: number;
  notes: string | null;
}

export interface AIDepartment {
  kind: DepartmentKind;
  displayName: string;
  required: boolean;
  reasoning: string;
}

export interface AIBudgetLine {
  department: DepartmentKind;
  label: string;
  amountINR: number;
  notes: string | null;
}

export interface AIScriptSummary {
  characters: { characters: AICharacter[] };
  scenes: { scenes: AIScene[] };
  combinations: {
    groups: AICombinationGroup[];
    totalEstimatedSavingsDays: number;
  };
  departments: { departments: AIDepartment[] };
  shootDays: {
    perActor: Array<{
      character: string;
      sceneCount: number;
      estimatedDays: number;
      notes: string | null;
    }>;
    totalShootDaysEstimate: number;
    optimizationHints: string[];
  };
  budget: {
    lines: AIBudgetLine[];
    totalINR: number;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    caveats: string[];
  };
}

export interface ScriptAnalysisResponse {
  script: ScriptRecord;
  summary: AIScriptSummary | null;
}

// ---------------- Workspace ----------------

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface DepartmentSummary {
  id: string;
  kind: DepartmentKind;
  displayName: string;
  required: boolean;
  progress: number;
  tasks: { todo: number; inProgress: number; done: number; blocked: number };
}

export interface ProjectHealth {
  project: {
    id: string;
    name: string;
    currentStage: ProjectStage;
    shootStartDate: string | null;
    shootEndDate: string | null;
  };
  overallProgress: number;
  departments: DepartmentSummary[];
  openConflicts: number;
  nextShootDay: {
    id: string;
    dayNumber: number;
    date: string;
    location: string | null;
  } | null;
}

export interface Task {
  id: string;
  projectId: string;
  departmentId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  characterId: string | null;
  sceneId: string | null;
  shootDayId: string | null;
  assigneeUserId: string | null;
  createdAt: string;
  updatedAt: string;
  department?: { id: string; displayName: string; kind: DepartmentKind };
}

export interface ShootDay {
  id: string;
  projectId: string;
  dayNumber: number;
  date: string;
  location: string | null;
  callTimeUserId: string | null;
  notes: string | null;
  scenes?: Array<{
    shootDayId: string;
    sceneId: string;
    order: number;
    scene: { id: string; sceneNumber: string; heading: string | null };
  }>;
}

export type ConflictKind = 'SCHEDULE_CLASH' | 'DEPT_BEHIND' | 'MISSING_DEPENDENCY';
export type ConflictSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface ConflictAlert {
  id: string;
  projectId: string;
  kind: ConflictKind;
  severity: ConflictSeverity;
  title: string;
  body: string;
  contextJson: Record<string, unknown> | null;
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

// ---------------- Members ----------------

export type MembershipStatus = 'INVITED' | 'ACTIVE' | 'REMOVED';

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string | null;
  inviteePhone: string | null;
  inviteeEmail: string | null;
  inviteeName: string | null;
  role: UserRole;
  projectDepartmentId: string | null;
  status: MembershipStatus;
  invitedAt: string;
  acceptedAt: string | null;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
  } | null;
  projectDepartment?: { id: string; displayName: string; kind: DepartmentKind } | null;
  setStatus?: SetStatus;
  setStatusNote?: string | null;
  setStatusUpdatedAt?: string | null;
}

export type SetStatus = 'ON_SET' | 'EN_ROUTE' | 'DONE' | 'OFF';

export interface ProjectInvite extends ProjectMember {
  project: { id: string; name: string; language: ProjectLanguage; genre: string };
}

export interface HomeDashboard {
  greeting: string;
  projectId: string;
  project: {
    id: string;
    name: string;
    currentStage: ProjectStage;
    shootStartDate: string | null;
    shootEndDate: string | null;
  };
  stats: {
    tasksDone: number;
    tasksTotal: number;
    shootDaysCompleted: number;
    shootDaysTotal: number;
    teamActive: number;
  };
  nextShootDay: {
    id: string;
    dayNumber: number;
    date: string;
    location: string | null;
  } | null;
  productions: {
    id: string;
    name: string;
    currentStage: ProjectStage;
    tasksDone: number;
    subtitle: string;
  }[];
}

export interface ActivityFeedItem {
  id: string;
  category: 'tasks' | 'schedule' | 'team';
  userId: string | null;
  userName: string;
  userInitials: string;
  action: string;
  targetLabel: string | null;
  statusBadge: string | null;
  createdAt: string;
  relativeTime: string;
}

export interface ActivityFeed {
  projectId: string;
  pulse: { actions: number; tasks: number; active: number };
  items: ActivityFeedItem[];
}

// ---------------- Realtime ----------------

export type RealtimeTopic =
  | 'task.created'
  | 'task.updated'
  | 'task.deleted'
  | 'member.invited'
  | 'member.updated'
  | 'shootday.created'
  | 'shootday.updated'
  | 'shootday.deleted'
  | 'conflict.created'
  | 'conflict.resolved'
  | 'script.analysis.updated'
  | 'notification.created'
  | 'character.updated'
  | 'scene.updated'
  | 'department.updated'
  | 'budgetline.updated';

export interface RealtimeEvent<T = unknown> {
  topic: RealtimeTopic;
  projectId: string;
  ts: string;
  data: T;
}

// ---------------- Notifications ----------------

export type NotificationKind =
  | 'CONFLICT_ALERT'
  | 'TASK_ASSIGNED'
  | 'TASK_DUE_SOON'
  | 'SHOOT_DAY_UPDATED'
  | 'SHOOT_DAY_CALL'
  | 'PROJECT_INVITE'
  | 'AI_ANALYSIS_DONE'
  | 'GENERIC';

export interface NotificationRecord {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  deepLink: string | null;
  projectId: string | null;
  readAt: string | null;
  createdAt: string;
  contextJson: Record<string, unknown> | null;
}

export type PushPlatform = 'IOS' | 'ANDROID' | 'WEB';

// ---------------- Editable AI rows ----------------

export interface CharacterRecord {
  id: string;
  projectId: string;
  name: string;
  importance: 'LEAD' | 'SUPPORT' | 'DAY_ROLE';
  estimatedScreenTimeMinutes: number | null;
  estimatedShootDays: number | null;
  castUserId: string | null;
  notes: string | null;
  isEdited: boolean;
  editedByUserId: string | null;
  editedAt: string | null;
  _count?: { appearances: number };
}

export interface SceneRecord {
  id: string;
  projectId: string;
  sceneNumber: string;
  heading: string | null;
  synopsis: string | null;
  locationType: 'INTERIOR' | 'EXTERIOR' | 'INT_EXT';
  timeOfDay: 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'UNSPECIFIED';
  locationName: string | null;
  estimatedPages: number | null;
  estimatedShootHours: number | null;
  hasStunts: boolean;
  hasVFX: boolean;
  hasSong: boolean;
  order: number;
  isEdited: boolean;
  appearances?: Array<{ character: { name: string } }>;
}

export interface DepartmentRecord {
  id: string;
  projectId: string;
  kind: DepartmentKind;
  displayName: string;
  required: boolean;
  progress: number;
  isEdited: boolean;
  _count?: { tasks: number };
}

export interface BudgetLineRecord {
  id: string;
  projectId: string;
  department: DepartmentKind;
  label: string;
  // Backend serialises BigInt as a string to preserve precision.
  amountINR: string;
  isAIDraft: boolean;
  isEdited: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
