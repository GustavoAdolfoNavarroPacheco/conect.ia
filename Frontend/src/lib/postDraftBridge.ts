const KEY = 'campus_post_draft_from_agent';

export type PostDraftFromAgent = {
  topic: string;
  tone: string;
  autoGenerate?: boolean;
};

export function savePostDraftFromAgent(draft: PostDraftFromAgent): void {
  sessionStorage.setItem(KEY, JSON.stringify(draft));
}

export function consumePostDraftFromAgent(): PostDraftFromAgent | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  sessionStorage.removeItem(KEY);
  try {
    return JSON.parse(raw) as PostDraftFromAgent;
  } catch {
    return null;
  }
}
