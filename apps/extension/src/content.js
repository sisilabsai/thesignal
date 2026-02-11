function getExcerpt() {
  const selection = window.getSelection && window.getSelection().toString().trim();
  if (selection) return selection;
  const meta = document.querySelector('meta[name="description"], meta[property="og:description"]');
  if (meta && meta.content) return meta.content.trim();
  const bodyText = document.body?.innerText?.replace(/\s+/g, ' ').trim();
  if (bodyText) return bodyText.slice(0, 400);
  return '';
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'GET_PAGE_DATA') return;
  const data = {
    url: window.location.href,
    title: document.title || window.location.hostname,
    excerpt: getExcerpt()
  };
  sendResponse(data);
  return true;
});
