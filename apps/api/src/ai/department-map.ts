import { DepartmentKind } from '@prisma/client';

const DEPARTMENT_ALIASES: Record<string, DepartmentKind> = {
  DIRECTION: DepartmentKind.DIRECTION,
  DIRECTOR: DepartmentKind.DIRECTION,
  PRODUCTION: DepartmentKind.PRODUCTION,
  CASTING: DepartmentKind.CASTING,
  DOP: DepartmentKind.DOP_CAMERA,
  CAMERA: DepartmentKind.DOP_CAMERA,
  DOP_CAMERA: DepartmentKind.DOP_CAMERA,
  ART: DepartmentKind.ART,
  ART_DEPARTMENT: DepartmentKind.ART,
  COSTUME: DepartmentKind.COSTUME,
  COSTUMES: DepartmentKind.COSTUME,
  MAKEUP: DepartmentKind.MAKEUP_HAIR,
  MAKEUP_HAIR: DepartmentKind.MAKEUP_HAIR,
  STUNTS: DepartmentKind.STUNTS,
  VFX: DepartmentKind.VFX,
  SOUND: DepartmentKind.SOUND,
  MUSIC: DepartmentKind.MUSIC,
  LOCATION: DepartmentKind.LOCATION,
  LOCATIONS: DepartmentKind.LOCATION,
  EDITORIAL: DepartmentKind.EDITORIAL,
  POST: DepartmentKind.POST_DI,
  POST_DI: DepartmentKind.POST_DI,
  POST_SOUND: DepartmentKind.POST_SOUND,
};

/** Maps free-text department labels from LLM output to Prisma DepartmentKind. */
export function mapDepartmentToKind(department: string): DepartmentKind {
  const key = department
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (key in DEPARTMENT_ALIASES) return DEPARTMENT_ALIASES[key]!;
  if (Object.values(DepartmentKind).includes(key as DepartmentKind)) {
    return key as DepartmentKind;
  }
  return DepartmentKind.OTHER;
}
