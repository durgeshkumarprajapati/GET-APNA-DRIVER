export interface TrustMatrixItem {
  featureId: string;
  featureName: string;
  uiComponent: string;
  apiRoute: string;
  serviceModule: string;
  dbTables: string[];
  realResultStatus: 'VERIFIED_END_TO_END' | 'UNSUPPORTED_EXPLICIT_NOTICE' | 'DEPRECATED';
  dataIntegrityStatus: 'NO_MOCK_VALUES' | 'CANONICAL_VALIDATED' | 'KNOWN_GAPS_DOCUMENTED';
  lastAuditedAt: string;
}

export interface ProductionTrustMatrixReport {
  overallIntegrityScore: number; // 0 - 100
  totalFeaturesAudited: number;
  verifiedEndToEndCount: number;
  unsupportedExplicitNoticeCount: number;
  fabricatedMockValuesFound: number;
  silentErrorSwallowingCount: number;
  matrix: TrustMatrixItem[];
  auditedAt: string;
}
