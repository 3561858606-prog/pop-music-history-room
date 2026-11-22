import * as M from './model.js';
import {t, LANG} from './i18n.js';
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));

export function aliasesHTML(track, field, exclude = []) {
  const names = M.aliasesOf(track, field, exclude);
  return names.length ? `<small class="name-aliases" title="${t('其它可用写法')}">${names.map(esc).join(' / ')}</small>` : '';
}
export function nameHTML(track, field, main) {
  const label = main ?? (field === 'style' ? M.styleOf(track).label : track[field]);
  return `<span class="name-main">${esc(label)}</span>${aliasesHTML(track, field, [label])}`;
}
// 每个选项只展示它自己的别名，不借用当前正确答案的曲目资料。
export function optionAliasesHTML(field, option) {
  if (field === 'year') return '';
  const track = M.tracks.find(t => String(t[field]) === option.value);
  return track ? aliasesHTML(track, field, [option.label]) : '';
}
/* 课件注记：评分年按什么口径、录音本身哪年发行、这一题用的是哪个版本。只在揭晓之后（答后反馈）和不考试的地方（唱片页贴近）出现。
   口径有分歧时（录音年份未定，或与评分年不同）默认展开，其余收起，不打扰读故事。 */
export function courseNoteHTML(track, className = 'course-note', open = null) {
  const basis = String(track.yearBasis || '').trim(), note = String(track.note || '').trim();
  if (!basis && !note) return '';
  const hasRel = Object.hasOwn(track, 'releaseYear'), rel = track.releaseYear;
  const differ = hasRel && (rel == null || rel !== track.year);
  const relText = !hasRel ? '' : rel == null ? t('尚未确认') : rel === track.year ? t('同评分年') : String(rel);
  // 旧曲目的 yearBasis 是短标签（如「课件标注年份」），第 8 讲的 yearBasis 与 note 是同一段话：同样的话只说一次
  const short = basis && basis !== note && basis.length <= 40 ? basis : '';
  const body = [note || basis, basis && basis !== note && !short ? basis : ''].filter(Boolean);
  const isOpen = open ?? differ;
  return `<details class="${className}"${isOpen ? ' open' : ''}><summary><span>${t('课件注记')}</span><em>${t('评分年 {y}', {y: track.year})}${differ ? ' · ' + (rel == null ? t('录音年份未定') : t('录音 {y}', {y: rel})) : ''}</em></summary>
    <dl class="cn-facts">
      <div><dt>${t('评分年')}</dt><dd>${track.year}${short ? ` <small lang="zh">${esc(short)}</small>` : ''}</dd></div>
      ${hasRel ? `<div${differ ? ' data-differ' : ''}><dt>${t('录音发行')}</dt><dd>${esc(relText)}</dd></div>` : ''}
      ${track.versionLabel ? `<div><dt>${t('本题版本')}</dt><dd lang="zh">${esc(track.versionLabel)}</dd></div>` : ''}
    </dl>
    ${LANG === 'zh' ? '' : `<p class="story-lang" lang="zh">${t('课件注记目前只有中文。')}</p>`}
    ${body.map(x => `<p class="cn-text" lang="zh">${esc(x)}</p>`).join('')}
  </details>`;
}
// 按曲目放长读：长读还在后台载入时先占个位，载入后原地补上，不重画整块。
export function trackStoryHTML(track, className = 'story') {
  if (M.storiesLoaded()) return storyHTML(M.storyOf(track), className, track);
  M.loadStories().then(() => {
    for (const el of document.querySelectorAll(`.story-slot[data-track="${track.id}"]`)) el.outerHTML = storyHTML(M.storyOf(track), el.dataset.cls, track);
  });
  return `<div class="story-slot" data-track="${track.id}" data-cls="${className}"></div>`;
}
export function storyHTML(story, className = 'story', track = null) {
  if (!story) return '';
  // 第 8 讲的短读开头就是评分口径原文：这句已经在「课件注记」里，不在这里重复
  const lead = story.lead || story.then, dupLead = !!track && !!lead && lead.trim() === String(track.note || '').trim();
  const sections = story.sections || [];
  const sources = (story.sources || story.src || []).filter(s => /^https?:\/\//.test(s.url));
  return `<section class="${className} reading-story"><h3>${t('当时')}</h3>${LANG === 'zh' ? '' : `<p class="story-lang" lang="zh">${t('这段音乐史解说目前只有中文。')}</p>`}
    ${dupLead ? '' : `<p class="story-lead" lang="zh">${esc(lead)}</p>`}
    ${sections.length ? `<details class="story-long"><summary>${t('读这首歌的故事与影响')} <span>${t('约 {n} 分钟', {n: Math.max(1, Math.ceil(sections.reduce((n,s) => n + s.text.length, 0) / 400))})}</span></summary>
      <div class="story-chapters">${sections.map(s => `<section><h4>${esc(s.title)}</h4><p>${esc(s.text)}</p></section>`).join('')}
      ${story.note ? `<p class="story-note">${esc(story.note)}</p>` : ''}
      ${sources.length ? `<div class="story-sources"><h4>${t('接着读')}</h4><ul>${sources.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ↗</a></li>`).join('')}</ul></div>` : ''}</div>
    </details>` : ''}</section>`;
}
