import * as M from './model.js';
import {summarize} from '../../../v3/core.js';
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = value => { const d = new Date(value); return Number.isFinite(+d) ? d.toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '旧记录'; };
export function renderHistory(root, ctx, limit = 20) {
  const rounds = M.history(), active = M.unfinished();
  root.innerHTML = `<div class="rs history"><header class="history-head"><div><p class="rs-kicker">保存在此浏览器</p><h1>听辨历史</h1></div><button data-h="backup">导出学习备份</button></header>
    ${active.length ? `<section class="history-active"><h2>继续未完成的一轮</h2>${active.map(r => `<button data-resume="${esc(r.id)}"><span>${r.questionType === 'written' ? '填空题' : '选择题'} · 已答 ${r.entries.length} / ${r.size} 首</span><time>${date(r.updatedAt)}</time><b>继续 →</b></button>`).join('')}</section>` : ''}
    <p class="rs-sub">${rounds.length ? '共 ' + rounds.length + ' 轮。选择一轮查看订正。' : '还没有结束的一轮。完成听辨后会保留在这里。'}</p>
    <ol class="history-list">${rounds.slice(0,limit).map(r => {
      const sum = summarize(r.entries), perfect = r.entries.filter(e => e.fields.every(f => f.isCorrect)).length;
      return `<li><button data-report="${esc(r.id)}"><time>${date(r.time || r.updatedAt)}</time><span><b>${r.questionType === 'written' ? '填空题' : '选择题'} · ${r.entries.length} 首</b><small>${r.legacy ? '旧记录，部分轮次信息未保存' : r.reason === 'early' ? '提前结束' : '已完成'}${Array.isArray(r.scope) ? ' · 第 ' + r.scope.join('、') + ' 讲' : ''}</small></span><span>四项全对 ${perfect}<small>单项正确率 ${sum.accuracy}%</small></span><b>查看 →</b></button></li>`;
    }).join('')}</ol>
    ${rounds.length > limit ? '<button class="history-more" data-h="more">再显示 20 轮</button>' : ''}
    <p class="history-note" role="status"></p><footer class="rs-foot"><button class="primary" data-h="disc">回到盘面</button></footer></div>`;
  root.onclick = async e => {
    const report = e.target.closest('[data-report]'), resume = e.target.closest('[data-resume]');
    if (report) return ctx.report(report.dataset.report);
    if (resume) return ctx.resume(resume.dataset.resume);
    const act = e.target.closest('[data-h]')?.dataset.h;
    if (act === 'more') return renderHistory(root, ctx, limit + 20);
    if (act === 'disc') return ctx.disc();
    if (act === 'backup') {
      try {
        const backup = await M.exportBackup(), url = URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)], {type:'application/json'}));
        const a = document.createElement('a'); a.href = url; a.download = '母盘学习备份-' + new Date().toISOString().slice(0,10) + '.json'; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000); root.querySelector('.history-note').textContent = '学习备份已导出。';
      } catch { root.querySelector('.history-note').textContent = '备份暂未导出，请保留页面后重试。'; }
    }
  };
}
