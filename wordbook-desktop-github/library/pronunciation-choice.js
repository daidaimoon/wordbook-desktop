// Show one IPA at a time; keep distinct recorded pronunciations accessible.
(() => {
  const selected = new Map();
  const host = document.querySelector('.pron');
  const choice = document.createElement('select');
  choice.id = 'pronunciationChoice';
  choice.setAttribute('aria-label', '选择发音用法');
  choice.title = '选择发音用法';
  choice.style.cssText = 'font:inherit;font-size:14px;color:inherit;background:transparent;border:1px solid #ddd;border-radius:6px;padding:5px 7px;max-width:220px;min-width:0;';
  host.append(choice);
  const recordedEntries = word => (word.pronunciations || []).filter(p => p.audio?.female || p.audio?.male);
  const getPronunciation = () => {
    const word = words[current];
    const entries = recordedEntries(word);
    return entries.find(p => p.id === selected.get(word.id)) || entries[0];
  };
  function simpleIPA(word, pronunciation) {
    if (word.w === 'a / an') return '/ə/ · /ən/';
    const raw = String(pronunciation?.ipa || word.ipa || '').trim();
    const enclosed = raw.match(/\/([^/]+)\//);
    const value = enclosed ? enclosed[1] : raw.split(/[；;，,]|\s[·|]\s/)[0].trim();
    return value ? '/' + value.replace(/^\/+|\/+$/g, '') + '/' : '';
  }
  function sync() {
    const word = words[current], entries = recordedEntries(word);
    choice.hidden = entries.length < 2;
    choice.replaceChildren(...entries.map(p => {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = p.label || '常用发音';
      return option;
    }));
    const p = getPronunciation();
    if (p) {
      choice.value = p.id;

    }
    $('ipa').textContent = simpleIPA(word, p);
    const audio = entries.length > 1 ? p?.audio : word.audio;
    document.querySelectorAll('[data-gender]').forEach(button => {
      const available = !!audio?.[button.dataset.gender];
      button.disabled = !available;
      button.style.opacity = available ? '' : '.35';
      button.title = (button.dataset.gender === 'female' ? '女声' : '男声') + (available ? '发音' : '录音待核验');
    });
  }
  const originalRender = render;
  render = function(...args) { const result = originalRender(...args); sync(); return result; };
  speak = function(text, rate = 1, gender = 'female') {
    const word = words[current], p = getPronunciation();
    const audio = recordedEntries(word).length > 1 ? p?.audio : word.audio;
    playRecording(audio?.[gender], rate, document.querySelector('[data-gender="' + gender + '"]'));
  };
  choice.addEventListener('change', () => {
    stopRecording(); selected.set(words[current].id, choice.value); sync();
  });
  sync();
})();
