"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ImageOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import type { Category } from "@/lib/types";

interface Form {
  title: string;
  categoryCode: string;
  city: string;
  startsAt: string; // "2026-10-20T18:30" from <input type="datetime-local">
  price: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
}

const EMPTY: Form = {
  title: "",
  categoryCode: "",
  city: "",
  startsAt: "",
  price: "",
  description: "",
  imageUrl: "",
  isActive: true,
};

function validate(form: Form): Partial<Record<keyof Form, string>> {
  const errors: Partial<Record<keyof Form, string>> = {};
  if (!form.title.trim()) errors.title = "Enter a title.";
  if (!form.categoryCode) errors.categoryCode = "Choose a category.";
  if (!form.city.trim()) errors.city = "Enter a city.";
  if (!form.startsAt) errors.startsAt = "Choose a date and time.";
  const price = Number(form.price);
  if (form.price.trim() === "" || !Number.isFinite(price) || price < 0)
    errors.price = "Enter a price of 0 or more (0 = free).";
  else if (!/^\d+(\.\d{1,2})?$/.test(form.price.trim()))
    errors.price = "Use at most 2 decimal places.";
  if (!form.description.trim()) errors.description = "Enter a description.";
  if (!/^https?:\/\/\S+$/i.test(form.imageUrl.trim()))
    errors.imageUrl = "Enter an image URL starting with http:// or https://.";
  return errors;
}

export default function NewEventPage() {
  const router = useRouter();
  const options = useApi<{ categories: Category[]; cities: string[] }>(
    "events/filters",
  );
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setServerError(null);
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await api("admin/events", {
        method: "POST",
        body: {
          title: form.title.trim(),
          categoryCode: form.categoryCode,
          city: form.city.trim(),
          // The admin enters India time; sending the offset removes any
          // doubt about which timezone was meant.
          startsAt: `${form.startsAt}:00+05:30`,
          priceRupees: Number(form.price),
          description: form.description.trim(),
          imageUrl: form.imageUrl.trim(),
          isActive: form.isActive,
        },
      });
      toast.success("Event created");
      router.push("/admin");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const categories =
    options.state.status === "success" ? options.state.result.data.categories : [];
  const cities =
    options.state.status === "success" ? options.state.result.data.cities : [];
  const pricePreview =
    form.price.trim() !== "" && Number(form.price) >= 0
      ? formatPrice(Math.round(Number(form.price) * 100))
      : null;

  const field = (key: keyof Form) => ({
    "aria-invalid": Boolean(errors[key]) || undefined,
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
  });
  const error = (key: keyof Form) =>
    errors[key] && (
      <p id={`${key}-error`} className="text-sm text-destructive">
        {errors[key]}
      </p>
    );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to events
      </Link>
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Add event</h1>

      <Card>
        <CardContent>
          <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                maxLength={200}
                onChange={(e) => set("title", e.target.value)}
                className="h-10"
                {...field("title")}
              />
              {error("title")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={form.categoryCode}
                onValueChange={(value) => set("categoryCode", value)}
              >
                <SelectTrigger id="category" className="w-full data-[size=default]:h-10" {...field("categoryCode")}>
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.code} value={category.code}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {error("categoryCode")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                list="known-cities"
                value={form.city}
                maxLength={100}
                onChange={(e) => set("city", e.target.value)}
                className="h-10"
                {...field("city")}
              />
              <datalist id="known-cities">
                {cities.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
              {error("city")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="startsAt">Date and time (India time)</Label>
              <Input
                id="startsAt"
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => set("startsAt", e.target.value)}
                className="h-10"
                {...field("startsAt")}
              />
              {error("startsAt")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price in ₹ (0 for free)</Label>
              <Input
                id="price"
                inputMode="decimal"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                className="h-10"
                {...field("price")}
              />
              {error("price") ??
                (pricePreview && (
                  <p className="text-sm text-muted-foreground">
                    Shown as {pricePreview}
                  </p>
                ))}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={5}
                maxLength={5000}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                {...field("description")}
              />
              {error("description")}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://…"
                value={form.imageUrl}
                onChange={(e) => {
                  set("imageUrl", e.target.value);
                  setImageFailed(false);
                }}
                className="h-10"
                {...field("imageUrl")}
              />
              {error("imageUrl")}
              {/^https?:\/\/\S+$/i.test(form.imageUrl.trim()) && (
                <div className="mt-2 flex aspect-16/9 max-w-sm items-center justify-center overflow-hidden rounded-lg border bg-muted">
                  {imageFailed ? (
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ImageOff className="size-4" /> Image could not be loaded
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.imageUrl.trim()}
                      alt="Preview"
                      className="size-full object-cover"
                      onError={() => setImageFailed(true)}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 sm:col-span-2">
              <Checkbox
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(checked) => set("isActive", checked === true)}
              />
              <Label htmlFor="isActive" className="font-normal">
                Active: show this event to visitors now
              </Label>
            </div>

            {serverError && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2"
              >
                {serverError}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
              <Button asChild variant="outline" size="lg" className="h-10">
                <Link href="/admin">Cancel</Link>
              </Button>
              <Button type="submit" size="lg" className="h-10" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                Create event
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
