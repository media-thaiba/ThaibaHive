export class TextTokenizer {
  private static stopWords = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
    'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further',
    'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his',
    'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my',
    'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours',
    'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that',
    'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those',
    'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where',
    'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself'
  ]);

  /**
   * Tokenize, clean, remove stopwords, and apply light stemming.
   */
  public static tokenize(text: string): string[] {
    const rawTokens = text
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1);

    const tokens: string[] = [];
    for (const raw of rawTokens) {
      if (!this.stopWords.has(raw)) {
        tokens.push(this.stem(raw));
      }
    }
    return tokens;
  }

  /**
   * Simple suffix-stripping Porter-like stemmer for common English endings
   */
  public static stem(word: string): string {
    if (word.length <= 3) return word;

    let res = word;
    if (res.endsWith('ation')) res = res.slice(0, -5);
    else if (res.endsWith('ating')) res = res.slice(0, -5);
    else if (res.endsWith('ing')) res = res.slice(0, -3);
    else if (res.endsWith('tion')) res = res.slice(0, -4);
    else if (res.endsWith('ments')) res = res.slice(0, -5);
    else if (res.endsWith('ment')) res = res.slice(0, -4);
    else if (res.endsWith('ies')) res = res.slice(0, -3) + 'y';
    else if (res.endsWith('es')) res = res.slice(0, -2);
    else if (res.endsWith('ed')) res = res.slice(0, -2);
    else if (res.endsWith('s') && !res.endsWith('ss')) res = res.slice(0, -1);

    return res;
  }
}
