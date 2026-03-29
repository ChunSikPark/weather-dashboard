/**
 * Live feed panel — renders tweets in the bottom-right corner.
 * Usage: initFeed(), addTweets(tweetsArray), clearFeed()
 */

const MAX_FEED_TWEETS = 50;
let _feedContainer = null;

function initFeed() {
  _feedContainer = document.getElementById('feed-list');
}

function addTweets(tweets) {
  if (!_feedContainer || tweets.length === 0) return;

  for (const tweet of tweets) {
    const el = document.createElement('div');
    el.className = 'feed-tweet';
    el.innerHTML = `
      <div class="tweet-header">
        <span class="tweet-handle mono">${escapeHtml(tweet.handle)}</span>
        <span class="tweet-time">${escapeHtml(tweet.time)}</span>
      </div>
      <div class="tweet-body">${highlightHashtags(escapeHtml(tweet.text))}</div>
    `;

    // Slide-in animation
    el.style.opacity = '0';
    el.style.transform = 'translateY(-10px)';
    _feedContainer.prepend(el);

    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.3s, transform 0.3s';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  }

  // Trim old tweets
  while (_feedContainer.children.length > MAX_FEED_TWEETS) {
    _feedContainer.removeChild(_feedContainer.lastChild);
  }
}

function clearFeed() {
  if (_feedContainer) {
    _feedContainer.innerHTML = '';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function highlightHashtags(text) {
  return text.replace(/(#\w+)/g, '<span class="tweet-hashtag">$1</span>');
}
