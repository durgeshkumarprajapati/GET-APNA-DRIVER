import { StatusBadge, type StatusBadgeTone } from './status-badge';

const SETTLEMENT_STATUS_TONE: Record<string, StatusBadgeTone> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  PAID: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral',
};

export function SettlementStatusBadge({ status }: { status: string }) {
  return <StatusBadge label={status} tone={SETTLEMENT_STATUS_TONE[status] ?? 'neutral'} />;
}

const PAYMENT_STATUS_TONE: Record<string, StatusBadgeTone> = {
  CREATED: 'neutral',
  PROCESSING: 'info',
  CAPTURED: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral',
  PARTIALLY_REFUNDED: 'warning',
  REFUNDED: 'warning',
};

export function PaymentStatusBadge({ status }: { status: string }) {
  return <StatusBadge label={status} tone={PAYMENT_STATUS_TONE[status] ?? 'neutral'} />;
}

const REFUND_STATUS_TONE: Record<string, StatusBadgeTone> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  PROCESSED: 'success',
  FAILED: 'danger',
};

export function RefundStatusBadge({ status }: { status: string }) {
  return <StatusBadge label={status} tone={REFUND_STATUS_TONE[status] ?? 'neutral'} />;
}

const PROMOTION_STATUS_TONE: Record<string, StatusBadgeTone> = {
  DRAFT: 'neutral',
  ACTIVE: 'success',
  PAUSED: 'warning',
  ARCHIVED: 'neutral',
};

/** `isExpired` overrides the stored status visually — see the PromotionStatus schema doc comment on why expiry is never a stored transition. */
export function PromotionStatusBadge({
  status,
  isExpired,
}: {
  status: string;
  isExpired?: boolean;
}) {
  if (isExpired) {
    return <StatusBadge label="EXPIRED" tone="danger" />;
  }
  return <StatusBadge label={status} tone={PROMOTION_STATUS_TONE[status] ?? 'neutral'} />;
}
