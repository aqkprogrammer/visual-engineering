import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "ttl-tradeoff",
    prompt: "You raise a page's CDN TTL from 60 seconds to 10 minutes. What changes?",
    options: [
      {
        id: "a",
        text: "Fewer requests reach the origin, but after an update users can see the old page for up to 10 minutes.",
        correct: true,
        explanation:
          "Longer freshness means more hits and less origin load — and older content after a change.",
      },
      {
        id: "b",
        text: "Nothing: TTLs only matter in browsers.",
        explanation: "Shared caches such as CDNs use TTLs (and s-maxage) too.",
      },
      {
        id: "c",
        text: "Users get the new version faster.",
        explanation: "The opposite: old copies are served for longer.",
      },
    ],
  },
  {
    id: "purge-burst",
    prompt: "Right after purging the whole CDN cache, what happens to the origin?",
    options: [
      {
        id: "a",
        text: "It gets a burst of requests, because the next request for every page has to go back to it.",
        correct: true,
        explanation:
          "Purges remove the protection the cache provides. Purge selectively, or use versioned URLs.",
      },
      {
        id: "b",
        text: "Its load drops, because the cache is empty.",
        explanation: "An empty cache sends more traffic to the origin, not less.",
      },
      {
        id: "c",
        text: "Nothing changes until the TTL expires.",
        explanation:
          "After a purge there is nothing cached to serve, so requests go straight through.",
      },
    ],
  },
  {
    id: "swr",
    prompt: "What does `stale-while-revalidate=60` allow a cache to do?",
    options: [
      {
        id: "a",
        text: "Keep serving a response for up to 60 seconds after it goes stale while fetching a fresh copy in the background.",
        correct: true,
        explanation: "Users don't wait for the refresh; some may get the old copy once (RFC 5861).",
      },
      {
        id: "b",
        text: "Refuse to serve anything older than 60 seconds.",
        explanation: "That is closer to max-age; stale-while-revalidate extends use beyond it.",
      },
      {
        id: "c",
        text: "Revalidate every 60 requests.",
        explanation: "The value is in seconds of staleness, not a request count.",
      },
    ],
  },
  {
    id: "versioned-urls",
    prompt:
      "Why do AWS and others recommend versioned file names such as app.3f9c2.js for content that changes often?",
    options: [
      {
        id: "a",
        text: "A new version is a new URL nothing has cached, so old copies can be cached for a long time and no purge is needed.",
        correct: true,
        explanation:
          "It also avoids old copies lingering in browser and proxy caches that a CDN purge can't reach.",
      },
      {
        id: "b",
        text: "Version numbers make files smaller.",
        explanation: "The name changes, not the content size.",
      },
      {
        id: "c",
        text: "CDNs can't cache files without version numbers.",
        explanation: "They can; versioning just makes updates safe with long TTLs.",
      },
    ],
  },
  {
    id: "origin-shield",
    prompt: "What does an origin shield add to a CDN?",
    options: [
      {
        id: "a",
        text: "A shared cache in front of the origin, so edges in many regions fetch through it and the origin sees fewer duplicate requests.",
        correct: true,
        explanation:
          "Requests for content it doesn't have are consolidated — as few as one origin request per object.",
      },
      {
        id: "b",
        text: "A firewall that blocks attacks on the origin.",
        explanation: "Some CDNs offer firewalls, but a shield is a caching layer.",
      },
      {
        id: "c",
        text: "A second origin in another region.",
        explanation: "It caches in front of the existing origin; it doesn't replace it.",
      },
    ],
  },
]);
