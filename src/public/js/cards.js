(async function () {
    const grid = document.getElementById('mapsGrid');
    if (!grid) return;

    let maps = [];
    try {
        maps = await fetch('data/maps.json', { cache: 'no-cache' }).then(r => r.json());
    } catch (e) {
        console.error('cards: failed to load maps.json', e);
        return;
    }

    if (window.i18n && window.i18n.ready) {
        try { await window.i18n.ready; } catch (e) { }
    }

    const t = (k) => (window.i18n && k ? window.i18n.t(k) : k);

    function buildHref(id, mode) {
        if (mode === 'training') return `${id}-training.html?mode=training`;
        return `${id}.html`;
    }

    function render(mode) {
        grid.innerHTML = maps.map(m => {
            const name = (m.nameKey ? t(m.nameKey) : m.id).toUpperCase();
            const desc = m.descriptionKey ? t(m.descriptionKey) : '';
            return `<a class="map-card menu-item" href="${buildHref(m.id, mode)}" data-map="${m.id}">
                <div class="banner"><img src="${m.image}" alt="${name}"></div>
                <div class="card-content">
                    <div class="card-text">
                        ${desc ? `<div class="map-desc">${desc}</div>` : ''}
                        <div class="map-name">${name}</div>
                    </div>
                </div>
            </a>`;
        }).join('');
        bindCards();
    }

    function bindCards() {
        const cards = grid.querySelectorAll('.menu-item');
        cards.forEach((card, idx) => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                cards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
            });
        });
        if (cards.length && !grid.dataset.firstSelected) {
            cards[0].classList.add('active');
            grid.dataset.firstSelected = '1';
        }
    }

    let currentMode = localStorage.getItem('currentMode') || 'training';
    render(currentMode);

    document.querySelectorAll('.mode-toggle-item').forEach(btn => {
        btn.addEventListener('click', () => {
            currentMode = btn.dataset.mode;
            localStorage.setItem('currentMode', currentMode);
            grid.dataset.firstSelected = '';
            render(currentMode);
        });
    });

    const playBtn = document.querySelector('.play-button');
    if (playBtn) {
        playBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const active = grid.querySelector('.menu-item.active') || grid.querySelector('.menu-item');
            if (!active) return;
            window.location.href = active.getAttribute('href');
        });
    }
})();
