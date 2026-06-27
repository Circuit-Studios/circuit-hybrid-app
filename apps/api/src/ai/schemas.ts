import { z } from 'zod';

/** Department taxonomy shared by task suggestions and project departments. */
export const departmentKindSchema = z.enum([
  'DIRECTION',
  'PRODUCTION',
  'CASTING',
  'DOP_CAMERA',
  'ART',
  'COSTUME',
  'MAKEUP_HAIR',
  'STUNTS',
  'VFX',
  'SOUND',
  'MUSIC',
  'LOCATION',
  'EDITORIAL',
  'POST_DI',
  'POST_SOUND',
  'OTHER',
]);
