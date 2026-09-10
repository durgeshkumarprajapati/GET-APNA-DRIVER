import { DriverLayout } from '@/components/driver-layout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * No scheduling/shift-roster domain exists anywhere in the backend (no
 * Schedule/Shift/Roster model in prisma/schema.prisma) — this previously
 * rendered a fully fabricated shift list. Per the "no fake pages" rule,
 * this is now an honest placeholder rather than invented data; build a real
 * page only once a scheduling backend exists.
 */
export default function DriverSchedulePage() {
  return (
    <DriverLayout>
      <div className="flex flex-col w-full px-6 py-6 gap-6">
        <PageHeader
          eyebrow="Duty Scheduling"
          title="Schedule"
          subtitle="Shift scheduling is not yet available."
        />
        <EmptyState
          icon="event_upcoming"
          message="Shift scheduling isn't available yet. Manage your availability from the duty toggle on your dashboard instead."
        />
      </div>
    </DriverLayout>
  );
}
