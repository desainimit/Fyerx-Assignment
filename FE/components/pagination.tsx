import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PageMeta } from "@/lib/types";

export function Pagination({
  meta,
  onPageChange,
}: {
  meta: PageMeta;
  onPageChange: (page: number) => void;
}) {
  if (meta.totalPages <= 1) return null;
  const first = (meta.page - 1) * meta.limit + 1;
  const last = Math.min(meta.page * meta.limit, meta.total);

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-sm text-muted-foreground">
        Showing {first}–{last} of {meta.total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="lg"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <ChevronLeft /> Previous
        </Button>
        <span className="px-2 text-sm font-medium">
          {meta.page} / {meta.totalPages}
        </span>
        <Button
          variant="outline"
          size="lg"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
