import * as M from './model.js';
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));

export function aliasesHTML(track, field, exclude = []) {
  const names = M.aliasesOf(track, field, exclude);
  return names.length ? `<small class="name-aliases" title="其它可用写法">${names.map(esc).join(' / ')}</small>` : '';
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
export function storyHTML(story, className = 'story') {
  if (!story) return '';
  const sections = story.sections || [];
  const sources = (story.sources || story.src || []).filter(s => /^https?:\/\//.test(s.url));
  return `<section class="${className} reading-story"><h3>当时</h3>
    <p class="story-lead">${esc(story.lead || story.then)}</p>
    ${sections.length ? `<details class="story-long"><summary>读这首歌的故事与影响 <span>约 ${Math.max(1, Math.ceil(sections.reduce((n,s) => n + s.text.length, 0) / 400))} 分钟</span></summary>
      <div class="story-chapters">${sections.map(s => `<section><h4>${esc(s.title)}</h4><p>${esc(s.text)}</p></section>`).join('')}
      ${story.note ? `<p class="story-note">${esc(story.note)}</p>` : ''}
      ${sources.length ? `<div class="story-sources"><h4>接着读</h4><ul>${sources.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ↗</a></li>`).join('')}</ul></div>` : ''}</div>
    </details>` : ''}</section>`;
}
