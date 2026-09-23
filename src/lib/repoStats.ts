import { projects, type ProjectId } from '@/components/observatory/curiosity';

export type RepoStats = { stars: number; openIssues: number; pushedAt: string };
export type RepoStatsMap = Partial<Record<ProjectId, RepoStats>>;

let cached: Promise<RepoStatsMap> | undefined;

/**
 * Public GitHub numbers for each project, fetched once per build (or once per
 * dev-server process, to stay inside the unauthenticated rate limit). A
 * failed request just leaves that project without stats. Set GITHUB_TOKEN to
 * raise the limit in CI.
 */
export function loadRepoStats() {
  cached ??= fetchAll();
  return cached;
}

async function fetchAll(): Promise<RepoStatsMap> {
  const token = import.meta.env.GITHUB_TOKEN as string | undefined;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'hanyu-observatory',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const entries = await Promise.all(Object.entries(projects).map(async ([id, project]) => {
    const match = project.repository.match(/github\.com\/([^/]+)\/([^/#?]+)/);
    if (!match) return null;
    try {
      const response = await fetch(`https://api.github.com/repos/${match[1]}/${match[2]}`, { headers, signal: AbortSignal.timeout(6000) });
      if (!response.ok) return null;
      const data = await response.json() as { stargazers_count: number; open_issues_count: number; pushed_at: string };
      return [id, { stars: data.stargazers_count, openIssues: data.open_issues_count, pushedAt: data.pushed_at }] as const;
    } catch {
      return null;
    }
  }));
  return Object.fromEntries(entries.filter(entry => entry !== null)) as RepoStatsMap;
}

/** "today", "yesterday", "5 days ago", "3 weeks ago", "2 months ago". */
export function describePush(pushedAt: string, now = Date.now()) {
  const days = Math.max(0, Math.floor((now - Date.parse(pushedAt)) / 86_400_000));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}
