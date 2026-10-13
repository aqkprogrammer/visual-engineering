/** Interview question levels and kinds. Zod-free, so client components can import them. */
export const INTERVIEW_LEVELS = ["junior", "mid", "senior"] as const;
export type InterviewLevel = (typeof INTERVIEW_LEVELS)[number];

export const INTERVIEW_KINDS = ["concept", "design", "debugging", "trade-off"] as const;
export type InterviewKind = (typeof INTERVIEW_KINDS)[number];
