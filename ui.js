// Local SVG icons keep the interface available without a network connection.
(() => {
  const paths = {
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 4 18 4 18 0V5M3 12c0 4 18 4 18 0"/>',
    upload: '<path d="M7 17H5a4 4 0 0 1-1-7 8 8 0 0 1 15-2 5 5 0 0 1 0 10h-2M12 21V11m-4 4 4-4 4 4"/>',
    download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
    cap: '<path d="m2 8 10-5 10 5-10 5zM6 10v7l6 3 6-3v-7M22 8v8"/>',
    book: '<path d="M12 5v16M12 5C9 2 5 3 2 3v16c4-1 7 0 10 2 3-2 6-3 10-2V3c-3 0-7-1-10 2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
    save: '<path d="M4 3h13l4 4v14H3V3zM7 3v6h10V3M7 21v-8h10v8"/>',
    play: '<path d="m8 4 13 8-13 8z" fill="currentColor" stroke="none"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    target: '<circle cx="11" cy="13" r="9"/><circle cx="11" cy="13" r="5"/><path d="m11 13 9-9M16 4h4v4"/>',
    bulb: '<path d="M8 16a7 7 0 1 1 8 0l-1 3H9zM9 22h6"/>',
    exit: '<path d="M10 4H4v16h6M9 12h12m-4-4 4 4-4 4"/>',
    send: '<path d="m22 2-7 20-4-9-9-4zM11 13 22 2"/>',
    chart: '<path d="M5 20v-7M12 20V4M19 20V9" stroke-width="4"/>',
    grid: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="m8 13-2 9 6-3 6 3-2-9"/>'
  };
  window.renderIcons = (root = document) => {
    root.querySelectorAll('[data-icon]').forEach(node => {
      if (!paths[node.dataset.icon]) return;
      const markup = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[node.dataset.icon]}</svg>`;
      if (node.tagName === 'I') node.outerHTML = markup;
      else node.innerHTML = markup;
    });
  };
  renderIcons();
  document.getElementById('navBank').addEventListener('click', () => document.getElementById('openQuestionBankBtn').click());
  document.getElementById('navSetup').addEventListener('click', () => {
    showPanel(document.getElementById('setupPanel'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  const guide = document.getElementById('guideDialog');
  ['navGuide', 'openGuideBtn'].forEach(id => document.getElementById(id).addEventListener('click', () => guide.showModal()));
  document.getElementById('closeGuideBtn').addEventListener('click', () => guide.close());
  guide.addEventListener('click', event => { if (event.target === guide) {
    const rect = guide.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) guide.close();
  } });
  document.querySelectorAll('.upload-file-label').forEach(zone => {
    ['dragenter', 'dragover'].forEach(type => zone.addEventListener(type, event => {
      event.preventDefault(); zone.classList.add('drag-over');
    }));
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', event => {
      event.preventDefault(); zone.classList.remove('drag-over');
      if (!event.dataTransfer.files.length) return;
      const input = zone.querySelector('input');
      input.files = event.dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
})();
