(() => {
  const params = new URLSearchParams(location.search);
  const controls = document.querySelector('.library-controls');
  if (controls) {
    const fields = [...controls.querySelectorAll('input, select')];
    const groups = [...document.querySelectorAll('[data-category]')];
    const orbs = [...document.querySelectorAll('[data-open-category]')];
    const collectionPanel = document.querySelector('.collections');
    const showAll = document.querySelector('.show-all');
    let pinned = false;
    const syncCollections = () => {
      for (const orb of orbs) {
        const selected = orb.dataset.openCategory === fields[2].value;
        orb.setAttribute('aria-expanded', String(selected));
        orb.setAttribute('aria-pressed', String(selected && pinned));
      }
      if (showAll) showAll.hidden = !fields.some(field => field.value);
    };
    const updateURL = () => {
      const url = new URL(location.href);
      for (const field of fields) {
        if (field.value) url.searchParams.set(field.id, field.value);
        else url.searchParams.delete(field.id);
      }
      history.replaceState(history.state, '', url);
    };
    function filter() {
      const query = fields[0].value.trim().toLowerCase();
      const topic = fields[1].value, category = fields[2].value;
      let visible = 0;
      for (const group of groups) {
        let count = 0;
        for (const card of group.querySelectorAll('.article-card')) {
          card.hidden = Boolean(category && group.dataset.category !== category ||
            topic && !card.firstElementChild.dataset.topics.split(' ').includes(topic) ||
            !card.textContent.toLowerCase().includes(query));
          if (!card.hidden) count++;
        }
        group.hidden = !count;
        visible += count;
      }
      syncCollections();
      controls.querySelector('output').textContent = visible ? visible + ' 篇' : '没有匹配的笔记，请调整搜索或筛选条件。';
    }
    for (const field of fields) {
      field.value = params.get(field.id) || '';
      field.addEventListener('input', () => {
        const url = new URL(location.href);
        if (field.value) url.searchParams.set(field.id, field.value);
        else url.searchParams.delete(field.id);
        history.replaceState(history.state, '', url);
        if (field.id === 'category') pinned = Boolean(field.value);
        filter();
      });
    }
    if (collectionPanel) {
      pinned = Boolean(fields[2].value);
      collectionPanel.hidden = false;
      document.querySelector('.collection-help').hidden = false;
      const choose = (id) => { fields[2].value = id; updateURL(); filter(); };
      for (const orb of orbs) {
        orb.addEventListener('pointerenter', event => {
          if (event.pointerType === 'mouse' && !pinned) choose(orb.dataset.openCategory);
        });
        orb.addEventListener('click', () => {
          pinned = !(pinned && fields[2].value === orb.dataset.openCategory);
          choose(orb.dataset.openCategory);
        });
      }
      showAll.addEventListener('click', () => {
        pinned = false;
        fields.forEach(field => { field.value = ''; });
        choose('');
      });
      collectionPanel.addEventListener('keydown', event => {
        if (event.key === 'Escape') { pinned = false; choose(''); }
      });
      function revealCategory() {
        const id = location.hash.slice(1);
        if (groups.some(group => group.id === id)) {
          pinned = true;
          fields.forEach(field => { field.value = ''; });
          choose(id);
          document.getElementById(id).scrollIntoView();
        }
      }
      revealCategory();
      window.addEventListener('hashchange', revealCategory);
    }
    controls.hidden = false;
    filter();
    const routePanel = document.querySelector('#chain');
    function revealRoute() {
      if (['#engineering-route','#model-route'].includes(location.hash)) {
        routePanel.open = true;
        document.querySelector(location.hash).scrollIntoView();
      }
    }
    revealRoute();
    window.addEventListener('hashchange', revealRoute);
    document.addEventListener('click', event => {
      const link = event.target.closest('a');
      if (!link || !link.pathname.includes('/notes/')) return;
      try { sessionStorage.setItem('reading-return', JSON.stringify({url:location.href, scroll:scrollY})); } catch {}
    });
  }
  const library = document.querySelector('.crumb [data-library]');
  if (library) {
    try {
      const previous = JSON.parse(sessionStorage.getItem('reading-return'));
      const url = new URL(previous.url);
      if (url.origin === location.origin && url.pathname === new URL(library.href).pathname &&
          (document.referrer.startsWith(library.href) || params.has('route'))) {
        for (const link of document.querySelectorAll('[data-library]')) {
          link.href = url.href;
          link.addEventListener('click', () => sessionStorage.setItem('reading-scroll', JSON.stringify(previous)));
        }
      }
    } catch {}
  }
  if (controls) {
    try {
      const saved = JSON.parse(sessionStorage.getItem('reading-scroll'));
      sessionStorage.removeItem('reading-scroll');
      if (saved && saved.url === location.href) requestAnimationFrame(() => scrollTo(0, saved.scroll));
    } catch {}
  }
  for (const nav of document.querySelectorAll('[data-route]')) {
    if (nav.dataset.route === params.get('route')) {
      nav.hidden = false;
      document.querySelector('nav[aria-label="笔记导航"]').hidden = true;
    }
  }
  const toc = document.querySelector('.toc');
  if (toc) {
    const panel = document.createElement('details');
    panel.className = 'reading-toc';
    const summary = document.createElement('summary');
    summary.textContent = '本文目录';
    toc.before(panel);
    panel.append(summary, toc);
    const desktop = matchMedia('(min-width: 1300px)');
    const resize = () => {panel.open = desktop.matches;};
    resize();
    desktop.addEventListener('change', resize);
    const links = [...toc.querySelectorAll('a[href^="#"]')];
    const sections = links.map(a => document.getElementById(a.hash.slice(1)));
    function highlight() {
      let index = 0;
      sections.forEach((heading,i) => {if (heading && heading.getBoundingClientRect().top < innerHeight * 0.35) index=i;});
      links.forEach((a,i) => i === index ? a.setAttribute('aria-current','location') : a.removeAttribute('aria-current'));
    }
    highlight();
    window.addEventListener('scroll', highlight, {passive:true});
    toc.addEventListener('click', e => {if (!desktop.matches && e.target.closest('a')) panel.open = false;});
  }
  if (document.querySelector('.featured-grid') && ['#basics','#models','#applications'].includes(location.hash)) {
    location.replace('./series/' + location.hash);
  }
})();
