import { formatUkDateTime } from './config.js';
import { makeElement, safeExternalLink } from './accessibility.js';

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(b).localeCompare(String(a)));
}

function addOptions(select, values, label) {
  if (!select) return;
  const current = select.value;
  select.replaceChildren(makeElement('option', { text: `All ${label}`, attributes: { value: 'all' } }));
  values.forEach((value) => select.append(makeElement('option', { text: value, attributes: { value } })));
  select.value = [...select.options].some((option) => option.value === current) ? current : 'all';
}

export function initialiseNews(data, { limit = Infinity } = {}) {
  const container = document.querySelector('[data-news-list]');
  if (!container) return;
  const yearSelect = document.querySelector('[data-news-filters] [data-filter="year"]');
  const topicSelect = document.querySelector('[data-news-filters] [data-filter="topic"]');
  const items = data?.items || [];
  const modeCopy = document.querySelector('[data-news-mode-copy]');
  if (modeCopy) {
    modeCopy.textContent = data?.sample
      ? 'The sample dataset contains no invented stories. Use the direct Met Office link until validated feed items are available.'
      : 'Cards use short original summaries and direct source links. WeatherChart never republishes article bodies or Met Office images.';
  }
  const itemYear = (item) => {
    if (!item.publishedAt) return 'Undated';
    const date = new Date(item.publishedAt);
    return Number.isNaN(date.getTime()) ? 'Undated' : String(date.getUTCFullYear());
  };
  addOptions(yearSelect, unique(items.map(itemYear)), 'years');
  addOptions(topicSelect, unique(items.map((item) => item.topic)), 'topics');

  const render = () => {
    const year = yearSelect?.value || 'all';
    const topic = topicSelect?.value || 'all';
    const visible = items.filter((item) =>
      (year === 'all' || itemYear(item) === year) && (topic === 'all' || item.topic === topic)
    ).slice(0, limit);
    container.replaceChildren();
    if (!visible.length) {
      container.append(makeElement('p', { className: 'empty-state', text: data?.sample ? 'No source-linked news items are included in the sample dataset.' : 'No news cards match those filters.' }));
      return;
    }
    visible.forEach((item) => {
      const card = makeElement('article', { className: 'news-card' });
      const top = makeElement('div', { className: 'news-card__topline' });
      top.append(
        makeElement('span', { className: 'source-badge', text: data.sample ? 'Sample card' : item.sourceName || 'Met Office' }),
        makeElement('time', { text: formatUkDateTime(item.publishedAt, { dateOnly: true }), attributes: { datetime: item.publishedAt } })
      );
      const title = makeElement('h3', { text: item.title || 'Weather update' });
      const topicLabel = makeElement('span', { className: 'news-card__topic', text: item.topic || 'weather' });
      const take = makeElement('p', { className: 'news-card__take' });
      take.append(
        makeElement('strong', { text: "WeatherChart’s plain-English take" }),
        document.createTextNode(item.summary || 'A new Met Office update is available—read the official source for full details.')
      );
      card.append(top, title, topicLabel, take);
      const url = safeExternalLink(item.url);
      if (url) card.append(makeElement('a', { text: data.sample ? 'Visit the referenced Met Office section ↗' : 'Read at the Met Office ↗', attributes: { href: url, rel: 'external noopener' } }));
      container.append(card);
    });
  };

  if (yearSelect) yearSelect.onchange = render;
  if (topicSelect) topicSelect.onchange = render;
  render();
}
