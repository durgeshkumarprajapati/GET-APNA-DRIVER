import { CustomerLayout } from '@/components/customer-layout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * No "favorite driver" domain exists anywhere in the backend (no such model
 * in prisma/schema.prisma) — this previously rendered four fully fabricated
 * driver profiles. Per the "no fake pages" rule, this is now an honest
 * placeholder rather than invented data; build a real page only once a
 * favorites backend exists.
 */
export default function CustomerFavoritesPage() {
  return (
    <CustomerLayout>
      <div className="flex flex-col w-full gap-6">
        <PageHeader
          eyebrow="Rewards & Finance"
          title="Favorite Drivers"
          subtitle="Saving favorite drivers isn't available yet."
        />
        <EmptyState
          icon="star"
          message="Favoriting drivers isn't available yet. You can still rebook a driver you've ridden with before from your bookings history."
        />
      </div>
    </CustomerLayout>
  );
}
