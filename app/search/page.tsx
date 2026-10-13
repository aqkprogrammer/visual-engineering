import type { Metadata } from "next";
import { SearchView } from "@/components/search/search-view";
import { alternatesFor } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search every Visual Engineering lesson, learning path, playground demo and glossary term — instantly, in your browser, with nothing sent to a server.",
  alternates: alternatesFor("/search"),
};

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <header className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Search</h1>
        <p className="text-lg text-fg-muted">
          Lessons, learning paths, playground demos and glossary terms. Search runs entirely in your
          browser.
        </p>
      </header>
      <div className="mt-10">
        <SearchView />
      </div>
    </div>
  );
}
