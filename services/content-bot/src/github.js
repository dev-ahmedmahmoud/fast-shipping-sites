// Minimal GitHub client: read files at an exact commit, make one commit with several files, move a branch
// forward (never force), create/delete preview branches. Uses a fine-grained token for THIS repo only.
export class GitHub {
  constructor({ token, repo, clientDir, pathAllowed, fetchImpl = fetch }) {
    Object.assign(this, { token, repo, clientDir, pathAllowed, fetchImpl });
  }

  async api(method, path, body, { raw = false, okStatuses = [] } = {}) {
    const res = await this.fetchImpl(`https://api.github.com/repos/${this.repo}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'tanta-content-bot',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok && !okStatuses.includes(res.status)) {
      const e = new Error(`github ${method} ${path.split('?')[0]} -> ${res.status}`);
      e.status = res.status;
      throw e;
    }
    if (res.status === 204) return null;
    return raw ? res.text() : res.json();
  }

  async tip(branch) {
    const r = await this.api('GET', `/git/ref/heads/${encodeURIComponent(branch).replace(/%2F/g, '/')}`);
    return r.object.sha;
  }

  /** Paths (relative to the client folder) of every file under it at this commit. */
  async listFiles(sha) {
    const r = await this.api('GET', `/git/trees/${sha}?recursive=1`);
    if (r.truncated) throw new Error('github tree truncated');
    const prefix = this.clientDir + '/';
    return r.tree.filter((x) => x.type === 'blob' && x.path.startsWith(prefix)).map((x) => x.path.slice(prefix.length));
  }

  /**
   * ALL the client's text files at one commit in ONE call (GraphQL), to stay far under the free plan's
   * 50 outside-calls limit. Returns Map rel -> text (elections.json, client.json, content/**.md).
   */
  async readClientFiles(sha) {
    const [owner, name] = this.repo.split('/');
    const blob = '... on Blob { text }';
    let tree = blob;
    for (let i = 0; i < 4; i++) tree = `${blob} ... on Tree { entries { name type object { ${tree} } } }`;
    const query = `query($o:String!,$n:String!,$a:String!,$b:String!,$c:String!){repository(owner:$o,name:$n){
      a: object(expression:$a){ ${blob} } b: object(expression:$b){ ${blob} } c: object(expression:$c){ ${tree} } } }`;
    const res = await this.fetchImpl('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json', 'User-Agent': 'tanta-content-bot' },
      body: JSON.stringify({ query, variables: { o: owner, n: name, a: `${sha}:${this.clientDir}/elections.json`, b: `${sha}:${this.clientDir}/client.json`, c: `${sha}:${this.clientDir}/content` } }),
    });
    if (!res.ok) { const e = new Error(`github graphql -> ${res.status}`); e.status = res.status; throw e; }
    const j = await res.json();
    if (j.errors?.length) throw new Error('github graphql error');
    const r = j.data.repository, files = new Map();
    if (typeof r.a?.text === 'string') files.set('elections.json', r.a.text);
    if (typeof r.b?.text === 'string') files.set('client.json', r.b.text);
    const walk = (node, prefix) => {
      for (const e of node?.entries || []) {
        const rel = `${prefix}/${e.name}`;
        if (e.type === 'tree') walk(e.object, rel);
        else if (e.type === 'blob' && e.name.endsWith('.md') && typeof e.object?.text === 'string') files.set(rel, e.object.text);
      }
    };
    walk(r.c, 'content');
    return files;
  }

  readFile(rel, sha) {
    return this.api('GET', `/contents/${this.clientDir}/${rel.split('/').map(encodeURIComponent).join('/')}?ref=${sha}`, null, { raw: true });
  }

  /** One commit on top of baseSha containing `files` {rel: newText}. Returns the new commit sha (no branch moved). */
  async makeCommit(baseSha, files, message) {
    const entries = [];
    for (const [rel, content] of Object.entries(files)) {
      const full = `${this.clientDir}/${rel}`;
      if (!this.pathAllowed(full)) throw new Error('path not allowed');
      entries.push({ path: full, mode: '100644', type: 'blob', content });
    }
    if (!entries.length) throw new Error('nothing to commit');
    const base = await this.api('GET', `/git/commits/${baseSha}`);
    const tree = await this.api('POST', '/git/trees', { base_tree: base.tree.sha, tree: entries });
    const who = { name: 'Tanta Content Bot', email: 'content-bot@users.noreply.github.com', date: new Date().toISOString() };
    const c = await this.api('POST', '/git/commits', { message, tree: tree.sha, parents: [baseSha], author: who, committer: who });
    return c.sha;
  }

  /** Fast-forward only. Returns false when the branch moved (caller retries on the new tip). */
  async fastForward(branch, sha) {
    try {
      await this.api('PATCH', `/git/refs/heads/${branch}`, { sha, force: false });
      return true;
    } catch (e) {
      if (e.status === 422 || e.status === 409) return false;
      throw e;
    }
  }
  createBranch(branch, sha) { return this.api('POST', '/git/refs', { ref: `refs/heads/${branch}`, sha }); }
  async deleteBranch(branch) {
    if (!branch.startsWith('content/')) throw new Error('refusing to delete a non content/ branch');
    await this.api('DELETE', `/git/refs/heads/${branch}`, null, { okStatuses: [404, 422] });
  }
}
