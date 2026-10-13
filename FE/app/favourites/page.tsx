import { Suspense } from "react";
import { FavouritesPicker } from "./favourites-picker";

export default function FavouritesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Favourite categories
        </h1>
        <p className="mt-1 text-muted-foreground">
          My Feed shows upcoming events from the categories you pick.
        </p>
      </div>
      <Suspense>
        <FavouritesPicker />
      </Suspense>
    </div>
  );
}
