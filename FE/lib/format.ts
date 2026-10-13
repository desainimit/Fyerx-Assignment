const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** 15000000 paise -> "₹1,50,000"; 0 -> "Free". */
export function formatPrice(pricePaise: number): string {
  return pricePaise === 0 ? "Free" : rupees.format(pricePaise / 100);
}

// Always shown in India time, so the server render and the browser agree.
const dateParts = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

/** "2026-10-18T13:00:00Z" -> "Sun, 18 Oct, 6:30 PM". */
export function formatDate(iso: string): string {
  // Built from parts: en-IN prints "pm" in lowercase, and some browsers use a
  // narrow no-break space before it, which would differ between runtimes.
  const parts = Object.fromEntries(
    dateParts.formatToParts(new Date(iso)).map((p) => [p.type, p.value]),
  );
  return `${parts.weekday}, ${parts.day} ${parts.month}, ${parts.hour}:${parts.minute} ${parts.dayPeriod.toUpperCase()}`;
}
