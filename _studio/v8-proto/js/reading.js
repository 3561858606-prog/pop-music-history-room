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
// 按曲目放长读：长读还在后台载入时先占个位，载入后原地补上，不重画整块。
export function trackStoryHTML(track, className = 'story') {
  if (M.storiesLoaded()) return storyHTML(M.storyOf(track), className);
  M.loadStories().then(() => {
    for (const el of document.querySelectorAll(`.story-slot[data-track="${track.id}"]`)) el.outerHTML = storyHTML(M.storyOf(track), el.dataset.cls);
  });
  return `<div class="story-slot" data-track="${track.id}" data-cls="${className}"></div>`;
}
export function storyHTML(story, className = 'story') {
  if (!story) return '';
  const sections = story.sections || [];
  const sources = (story.sources || story.src || []).filter(s => /^https?:\/\//.test(s.url));
  return `<section class="${className} reading-story"><h3>${t('当时')}</h3>${LANG === 'zh' ? '' : `<p class="story-lang" lang="zh">${t('这段音乐史解说目前只有中文。')}</p>`}
    <p class="story-lead" lang="zh">${esc(story.lead || story.then)}</p>
    ${sections.length ? `<details class="story-long"><summary>${t('读这首歌的故事与影响')} <span>${t('约 {n} 分钟', {n: Math.max(1, Math.ceil(sections.reduce((n,s) => n + s.text.length, 0) / 400))})}</span></summary>
      <div class="story-chapters">${sections.map(s => `<section><h4>${esc(s.title)}</h4><p>${esc(s.text)}</p></section>`).join('')}
      ${story.note ? `<p class="story-note">${esc(story.note)}</p>` : ''}
      ${sources.length ? `<div class="story-sources"><h4>${t('接着读')}</h4><ul>${sources.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ↗</a></li>`).join('')}</ul></div>` : ''}</div>
    </details>` : ''}</section>`;
}
