import * as M from './model.js';
import {summarize} from '../../../v3/core.js';
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = value => { const d = new Date(value); return Number.isFinite(+d) ? d.toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '旧记录'; };

// 导入学习备份的进行状态。记录变化时历史页会整页重画，状态放在这里才不会丢。
let imp = null;
function importHTML() {
  if (!imp) return '';
  const file = `<p class="imp-file">${esc(imp.name)}${imp.exportedAt ? ' · 导出于 ' + date(imp.exportedAt) : ''}</p>`;
  const panel = (body, actions, state = imp.state) => `<section class="import-panel" data-state="${state}" aria-labelledby="impTitle"><h2 class="rs-kicker" id="impTitle">导入学习备份</h2>${file}${body}<div class="imp-act">${actions}</div></section>`;
  if (imp.state === 'reading') return panel('<p class="imp-msg" role="status">正在读取文件…</p>', '');
  if (imp.state === 'error') return panel(`<p class="imp-msg" role="alert">${esc(imp.message)}</p>`, '<button data-h="pick">换一个文件</button><button data-h="close">关闭</button>');
  if (imp.state === 'done') {
    const a = imp.added;
    return panel(`<p class="imp-msg" role="status">${a.rounds || a.events ? `已导入 ${a.rounds} 个轮次、${a.events} 次作答。盘面的刻纹已按合并后的记录更新。` : '没有需要补上的记录，这台浏览器里的记录保持不变。'}${imp.skipped ? `另有 ${imp.skipped} 条作答对应不到现在的曲目，已跳过。` : ''}</p>`,
      '<button class="primary" data-h="disc">回到盘面看看</button><button data-h="close">好的</button>');
  }
  const p = imp.info, busy = imp.state === 'busy';
  if (!p.newEvents && !p.newRounds && !p.newActive)
    return panel(`<p class="imp-msg">这份备份里的 ${p.rounds} 轮、${p.events} 次作答，这台浏览器都已经有了，不需要再导入。</p>`, '<button data-h="close">知道了</button>');
  return panel(`<dl class="imp-sum"><div><dt>新增听辨</dt><dd><b>${p.newRounds}</b>轮</dd></div><div><dt>新增作答</dt><dd><b>${p.newEvents}</b>次</dd></div></dl>
      <p class="imp-msg">备份里共有 ${p.rounds} 轮、${p.events} 次作答${p.newActive ? `，另有 ${p.newActive} 轮没答完，导入后可以接着答` : ''}。只补上这台浏览器里没有的记录，已有的不会被改动或覆盖。${imp.skipped ? `有 ${imp.skipped} 条作答对应不到现在的曲目，会跳过。` : ''}</p>`,
    `<button class="primary" data-h="merge" ${busy ? 'disabled' : ''}>${busy ? '正在导入…' : '合并导入'}</button>${busy ? '' : '<button data-h="close">取消</button>'}`);
}

export function renderHistory(root, ctx, limit = 20) {
  if (root.hidden && imp?.state !== 'busy') imp = null;   // 重新进入历史页时清掉上次的导入结果
  const rounds = M.history(), active = M.unfinished();
  root.innerHTML = `<div class="rs history"><header class="history-head"><div><p class="rs-kicker">保存在此浏览器</p><h1>听辨历史</h1></div>
      <div class="history-tools"><button data-h="backup">导出学习备份</button><button data-h="pick">导入学习备份</button></div></header>
    <input type="file" id="importFile" accept=".json,application/json" hidden>
    <p class="history-tip">换网址或换设备时：先在原来的网站导出备份，再在这里导入<span class="drop-hint">；也可以把备份文件直接拖到这一页</span>。</p>
    ${importHTML()}
    ${active.length ? `<section class="history-active"><h2>继续未完成的一轮</h2>${active.map(r => `<button data-resume="${esc(r.id)}"><span>${r.questionType === 'written' ? '填空题' : '选择题'} · 已答 ${r.entries.length} / ${r.size} 首</span><time>${date(r.updatedAt)}</time><b>继续 →</b></button>`).join('')}</section>` : ''}
    <p class="rs-sub">${rounds.length ? '共 ' + rounds.length + ' 轮。选择一轮查看订正。' : '还没有结束的一轮。完成听辨后会保留在这里。'}</p>
    <ol class="history-list">${rounds.slice(0,limit).map(r => {
      const sum = summarize(r.entries), perfect = r.entries.filter(e => e.fields.every(f => f.isCorrect)).length;
      return `<li><button data-report="${esc(r.id)}"><time>${date(r.time || r.updatedAt)}</time><span><b>${r.questionType === 'written' ? '填空题' : '选择题'} · ${r.entries.length} 首</b><small>${r.legacy ? '旧记录，部分轮次信息未保存' : r.reason === 'early' ? '提前结束' : '已完成'}${Array.isArray(r.scope) ? ' · 第 ' + r.scope.join('、') + ' 讲' : ''}</small></span><span>四项全对 ${perfect}<small>单项正确率 ${sum.accuracy}%</small></span><b>查看 →</b></button></li>`;
    }).join('')}</ol>
    ${rounds.length > limit ? '<button class="history-more" data-h="more">再显示 20 轮</button>' : ''}
    <p class="history-note" role="status"></p><footer class="rs-foot"><button class="primary" data-h="disc">回到盘面</button></footer></div>`;

  const redraw = focus => { renderHistory(root, ctx, limit); if (focus) root.querySelector(focus)?.focus({preventScroll: true}); };
  async function readFile(file) {
    if (!file || imp?.state === 'busy') return;
    imp = {state: 'reading', name: file.name}; redraw();
    try {
      if (file.size > 30 * 1024 * 1024) throw new Error('这个文件太大，不像是学习备份。');
      const backup = M.parseBackup(await file.text());
      imp = {state: 'preview', name: file.name, exportedAt: backup.exportedAt, skipped: backup.skipped, backup, info: await M.previewImport(backup)};
    } catch (error) { imp = {state: 'error', name: file.name, message: error.message || '这个文件暂时读不出来。'}; }
    redraw('.import-panel .imp-act button');
    root.querySelector('.import-panel')?.scrollIntoView({block: 'nearest'});
  }

  root.onclick = async e => {
    const report = e.target.closest('[data-report]'), resume = e.target.closest('[data-resume]');
    if (report) return ctx.report(report.dataset.report);
    if (resume) return ctx.resume(resume.dataset.resume);
    const act = e.target.closest('[data-h]')?.dataset.h;
    if (act === 'more') return renderHistory(root, ctx, limit + 20);
    if (act === 'disc') { imp = null; return ctx.disc(); }
    if (act === 'pick') return root.querySelector('#importFile').click();
    if (act === 'close') { imp = null; return redraw('[data-h=pick]'); }
    if (act === 'merge' && imp?.state === 'preview') {
      const {name, exportedAt, skipped, backup} = imp;
      imp = {...imp, state: 'busy'}; redraw();
      try { imp = {state: 'done', name, exportedAt, skipped, added: await M.importBackup(backup)}; }
      catch { imp = {state: 'error', name, exportedAt, message: '导入没有完成，这台浏览器原有的记录没有改动。请重试。'}; }
      return redraw('.import-panel .imp-act button');
    }
    if (act === 'backup') {
      try {
        const backup = await M.exportBackup(), url = URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)], {type:'application/json'}));
        const a = document.createElement('a'); a.href = url; a.download = '母盘学习备份-' + new Date().toISOString().slice(0,10) + '.json'; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000); root.querySelector('.history-note').textContent = '学习备份已导出。';
      } catch { root.querySelector('.history-note').textContent = '备份暂未导出，请保留页面后重试。'; }
    }
  };
  root.onchange = e => { if (e.target.id === 'importFile') { const file = e.target.files[0]; e.target.value = ''; readFile(file); } };
  // 把备份文件拖进来也能导入
  const hasFile = e => [...(e.dataTransfer?.types || [])].includes('Files');
  root.ondragover = e => { if (!hasFile(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; root.dataset.drop = '1'; };
  root.ondragleave = e => { if (!root.contains(e.relatedTarget)) delete root.dataset.drop; };
  root.ondrop = e => { if (!hasFile(e)) return; e.preventDefault(); delete root.dataset.drop; readFile(e.dataTransfer.files[0]); };
}
