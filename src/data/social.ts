import type { Comment } from "@/types";

// MYVYB starts brand new — no demo comments. Real comments load live from the
// backend once viewers engage with a post.
export const DEMO_COMMENTS: Record<string, Comment[]> = {};

// Warm, human opener replies used only by the offline/local simulator when there
// is no backend conversation yet (so a first message never echoes into silence).
// The live backend uses real, person-to-person messages.
export const CANNED_REPLIES: string[] = [
  "I didn't think anyone would actually reach out. Thank you.",
  "Reading this made my night. What made you reach out?",
  "You're the first person I've told the rest of the story to…",
  "Honestly? I needed to hear that today.",
  "It feels strange and good to be seen. Tell me about you.",
];
