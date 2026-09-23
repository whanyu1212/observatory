export interface Searchable {
  label: string;
  /** Extra words that should find this entry without appearing in it, like a project's stack. */
  keywords?: string[];
}

const normalise = (text: string) => text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

/** True when every character of `query` appears in `text`, in order: "qrl" finds "QuantRL-Lab". */
function isSubsequence(query: string, text: string) {
  let at = 0;
  for (const character of text) if (character === query[at]) at++;
  return at === query.length;
}

/**
 * How well `query` matches an entry, or 0 for no match. A match at the start of
 * the label beats one at the start of a word, which beats one anywhere in it;
 * keywords and scattered letters come last.
 */
export function scoreCommand(query: string, entry: Searchable) {
  const words = normalise(query).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 1;
  const label = normalise(entry.label);
  const keywords = normalise((entry.keywords ?? []).join(' '));
  let total = 0;
  for (const word of words) {
    const index = label.indexOf(word);
    const score = index === 0 ? 5
      : index > 0 && /[\s\-·.]/.test(label[index - 1]) ? 4
        : index > 0 ? 3
          : keywords.includes(word) ? 2
            : word.length > 1 && isSubsequence(word, label.replace(/[^a-z0-9]/g, '')) ? 1
              : 0;
    if (!score) return 0;
    total += score;
  }
  return total;
}

/** The entries that match `query`, best first; ties keep their original order. */
export function searchCommands<T extends Searchable>(query: string, entries: T[]) {
  return entries
    .map((entry, index) => ({ entry, index, score: scoreCommand(query, entry) }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(result => result.entry);
}
