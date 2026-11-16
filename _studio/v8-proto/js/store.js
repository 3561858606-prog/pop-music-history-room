// 原型独立数据库。旧 localStorage 仅导入、保留；答案与轮次快照在同一事务提交。
export const DB_NAME = 'v8-proto-learning-v2';
export const uid = prefix => prefix + '-' + (globalThis.crypto?.randomUUID?.() || Date.now() + '-' + Math.random().toString(36).slice(2));
const clone = value => JSON.parse(JSON.stringify(value));
export class ConflictError extends Error {
  constructor() { super('这一轮已在另一个页面更新，请重新载入后继续；也可以回盘面开始新一轮。'); this.name = 'ConflictError'; }
}
export class LearningStore {
  constructor(name = DB_NAME) { this.name = name; this.db = null; }
  open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.name, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('events', {keyPath: 'eventId'});
        db.createObjectStore('rounds', {keyPath: 'id'});
        db.createObjectStore('meta', {keyPath: 'key'});
      };
      req.onsuccess = () => { this.db = req.result; this.db.onversionchange = () => this.db.close(); resolve(this); };
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('学习存储正在升级，请关闭其他原型页面后重试。'));
    });
  }
  transaction(names, work, mode = 'readwrite') {
    return new Promise((resolve, reject) => {
      let tx, value, failure;
      try {
        tx = this.db.transaction(names, mode);
        tx.oncomplete = () => resolve(value);
        tx.onabort = () => reject(failure || tx.error || new Error('保存事务未完成'));
        tx.onerror = () => {};
        work(tx, v => { value = v; }, error => { failure = error; tx.abort(); });
      } catch (error) { if (tx) { failure = error; try { tx.abort(); } catch {} } else reject(error); }
    });
  }
  readAll(name) {
    return this.transaction([name], (tx, done) => { const q = tx.objectStore(name).getAll(); q.onsuccess = () => done(q.result); }, 'readonly');
  }
  async importLegacy(events, rounds = [], backups = {}) {
    return this.transaction(['events', 'rounds', 'meta'], tx => {
      for (const [key, value] of Object.entries(backups)) {
        const s = tx.objectStore('meta'), q = s.get('legacy:' + key);
        q.onsuccess = () => { if (!q.result) s.put({key: 'legacy:' + key, value, time: new Date().toISOString()}); };
      }
      for (const [name, values, key] of [['events', events, 'eventId'], ['rounds', rounds, 'id']]) {
        const s = tx.objectStore(name);
        for (const value of values) { const q = s.get(value[key]); q.onsuccess = () => { if (!q.result) s.put(clone(value)); }; }
      }
    });
  }
  // revision 在事务中核对；不同轮次可以并行，同一轮次的旧页签不能覆盖新状态。
  saveRound(snapshot, entry = null) {
    return this.transaction(['rounds', 'events'], (tx, done, fail) => {
      const rounds = tx.objectStore('rounds'), events = tx.objectStore('events'), get = rounds.get(snapshot.id);
      get.onsuccess = () => {
        const old = get.result;
        if ((old?.revision || 0) !== (snapshot.revision || 0)) return fail(new ConflictError());
        const write = () => {
          const saved = {...clone(snapshot), revision: (old?.revision || 0) + 1, updatedAt: new Date().toISOString()};
          rounds.put(saved); done(saved);
        };
        if (!entry) return write();
        const q = events.get(entry.eventId);
        q.onsuccess = () => {
          if (q.result && JSON.stringify(q.result) !== JSON.stringify(entry)) return fail(new Error('作答编号冲突，未覆盖原答案。'));
          if (!q.result) events.add(clone(entry));
          write();
        };
      };
    });
  }
  archiveDraft(snapshot) {
    return this.transaction(['meta'], tx => tx.objectStore('meta').put({key: uid('conflict-draft'), snapshot: clone(snapshot), time: new Date().toISOString()}));
  }
  // 导入学习备份：只补上这里没有的作答和轮次，已有的一律不动。返回实际新增的数量。
  importBackup(events, rounds) {
    const added = {events: 0, rounds: 0};
    return this.transaction(['events', 'rounds'], (tx, done) => {
      done(added);
      for (const [name, values, key] of [['events', events, 'eventId'], ['rounds', rounds, 'id']]) {
        const s = tx.objectStore(name);
        for (const value of values) { const q = s.get(value[key]); q.onsuccess = () => { if (!q.result) { s.put(clone(value)); added[name]++; } }; }
      }
    });
  }
  async backup() {
    const [events, rounds, meta] = await Promise.all(['events', 'rounds', 'meta'].map(n => this.readAll(n)));
    return {version: 2, app: 'v8-proto', exportedAt: new Date().toISOString(), events, rounds, meta};
  }
  close() { this.db?.close(); }
}
