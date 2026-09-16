import type {
  ExperienceRecommendation,
  ExperienceType,
  ExperienceCategory,
  ExperienceActionPayload,
} from './experience-types';

export function createExperienceFingerprint(
  userId: string,
  type: ExperienceType,
  subjectId: string,
  timeBucket: string = 'v1',
): string {
  const safeUserId = userId.replace(/[^a-zA-Z0-9-]/g, '');
  const safeSubjectId = subjectId.replace(/[^a-zA-Z0-9-]/g, '');
  return `${safeUserId}:${type}:${safeSubjectId}:${timeBucket}`;
}

export function isRecommendationExpired(rec: ExperienceRecommendation): boolean {
  if (!rec.expiresAt) return false;
  return new Date(rec.expiresAt).getTime() <= Date.now();
}

export function buildRecommendation(params: {
  id?: string;
  type: ExperienceType;
  category: ExperienceCategory;
  title: string;
  description: string;
  reason: string;
  priority: number;
  isDismissable?: boolean;
  isMandatory?: boolean;
  fingerprint: string;
  action: ExperienceActionPayload;
  metadata?: Record<string, unknown>;
  expiresAt?: string;
}): ExperienceRecommendation {
  const isMandable = params.isMandatory ?? false;
  return {
    id:
      params.id ?? `rec_${params.type.toLowerCase()}_${Math.random().toString(36).substring(2, 9)}`,
    type: params.type,
    category: params.category,
    title: params.title,
    description: params.description,
    reason: params.reason,
    priority: Math.min(100, Math.max(0, params.priority)),
    isDismissable: isMandable ? false : (params.isDismissable ?? true),
    isMandatory: isMandable,
    fingerprint: params.fingerprint,
    action: params.action,
    metadata: params.metadata,
    createdAt: new Date().toISOString(),
    expiresAt: params.expiresAt,
  };
}
