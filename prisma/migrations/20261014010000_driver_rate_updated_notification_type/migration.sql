-- Phase: Admin-editable driver pricing. When an admin changes a driver's
-- hire rates, the driver needs to be notified — no existing
-- NotificationType value covers it.

-- AlterEnum
ALTER TYPE "notification_type" ADD VALUE 'DRIVER_RATE_UPDATED';
