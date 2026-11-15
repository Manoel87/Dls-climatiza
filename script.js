/* ==========================================================
   DLS Refrigeração — Scripts
   ========================================================== */

/* ---------- CONFIGURAÇÃO ----------
   Altere AQUI o número do WhatsApp da DLS.
   Formato: código do país + DDD + número, só dígitos.
   Exemplo: 5581988423159 */
const WHATSAPP_NUMBER = '5581988423159';

/** Monta o link do WhatsApp com mensagem pré-preenchida */
const waLink = (msg) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;

/* ==========================================================
   TELA DE ABERTURA (Splash) — exatamente 2300 ms
   - bloqueia a rolagem enquanto está ativa
   - depois faz fade-out, libera a rolagem e dispara o Hero
   ========================================================== */
const SPLASH_MS = 2300;
window.dlsSplashDone = false;

(function initSplash() {
  const splash = document.getElementById('splash');
  const root = document.documentElement;
  const finish = () => {
    window.dlsSplashDone = true;
    root.classList.remove('is-loading');
    document.body.classList.remove('is-loading');
    document.dispatchEvent(new Event('splash:done'));
  };
  if (!splash) { finish(); return; }

  root.classList.add('is-loading');
  document.body.classList.add('is-loading');
  splash.classList.add('is-running');

  setTimeout(() => {
    splash.classList.add('is-hidden');          // opacity 0 + visibility hidden (0.45s)
    finish();
    setTimeout(() => splash.remove(), 600);     // limpa o elemento depois do fade
  }, SPLASH_MS);
})();

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Ícones Lucide ---------- */
  if (window.lucide) lucide.createIcons();

  /* ---------- Links de WhatsApp (data-wa) ---------- */
  document.querySelectorAll('[data-wa]').forEach((el) => {
    el.href = waLink(el.dataset.wa);
    el.target = '_blank';
    el.rel = 'noopener';
  });

  /* ---------- Ano no rodapé ---------- */
  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Header: sombra ao rolar ---------- */
  const header = document.getElementById('header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Menu mobile ---------- */
  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('nav');
  const closeMenu = () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));

  /* ---------- Animações de scroll (Intersection Observer) ---------- */
  // Os elementos do Hero entram só depois da tela de abertura (veja startHero)
  const reveals = Array.from(document.querySelectorAll('.reveal')).filter((el) => !el.closest('.hero'));
  const heroReveals = Array.from(document.querySelectorAll('.hero .reveal'));
  const startHero = () => {
    heroReveals.forEach((el, i) => {
      el.style.transitionDelay = `${i * 110}ms`;
      el.classList.add('is-visible');
    });
  };
  if (window.dlsSplashDone) startHero();
  else document.addEventListener('splash:done', startHero, { once: true });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    reveals.forEach((el, i) => {
      // Pequeno atraso escalonado entre irmãos para efeito suave
      el.style.transitionDelay = `${(i % 4) * 80}ms`;
      io.observe(el);
    });
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  /* ==========================================================
     CALCULADORA DE BTUs
     Regra prática de mercado:
       - 600 BTU/h por m² (ambiente com pouco sol)
       - 800 BTU/h por m² (ambiente com sol da tarde)
       - + 600 BTU/h por pessoa (a partir da 2ª pessoa)
       - + 600 BTU/h se houver equipamentos eletrônicos
     O resultado é ajustado para a capacidade comercial
     mais próxima (acima) dos aparelhos vendidos no Brasil.
     ========================================================== */
  const COMMERCIAL_SIZES = [7000, 9000, 12000, 18000, 24000, 30000, 36000, 48000, 60000];

  const form = document.getElementById('calcForm');
  const result = document.getElementById('calcResult');
  const value = document.getElementById('btuValue');
  const whatsBtn = document.getElementById('btuWhats');
  const errorMsg = document.getElementById('calcError');
  const equipCheck = document.getElementById('equip');
  const equipWrap = document.getElementById('equipDetailsWrap');
  const equipInput = document.getElementById('equipDetails');

  // Campo "Quais equipamentos?" aparece ao marcar; ao desmarcar, esconde e limpa
  equipCheck.addEventListener('change', () => {
    equipWrap.hidden = !equipCheck.checked;
    if (!equipCheck.checked) equipInput.value = '';
    else equipInput.focus();
  });

  const formatBTU = (n) => n.toLocaleString('pt-BR');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const area = parseFloat(document.getElementById('area').value);
    const people = parseInt(document.getElementById('people').value, 10) || 1;
    const sun = document.getElementById('sun').value;
    const equip = equipCheck.checked;
    const equipDesc = equip ? equipInput.value.trim() : '';

    // Validação
    if (!area || area <= 0) {
      errorMsg.hidden = false;
      result.hidden = true;
      return;
    }
    errorMsg.hidden = true;

    // Cálculo
    const perM2 = sun === 'tarde' ? 800 : 600;
    let btus = area * perM2;
    btus += Math.max(people - 1, 0) * 600;
    if (equip) btus += 600;

    // Ajusta para o aparelho comercial mais próximo
    const recommended =
      COMMERCIAL_SIZES.find((size) => size >= btus) ||
      COMMERCIAL_SIZES[COMMERCIAL_SIZES.length - 1];

    const needsProject = btus > COMMERCIAL_SIZES[COMMERCIAL_SIZES.length - 1];

    value.textContent = `${formatBTU(recommended)} BTUs`;
    result.hidden = false;

    // Mensagem pré-preenchida para o WhatsApp
    const sunText = sun === 'tarde' ? 'sol da tarde / forte incidência' : 'sol da manhã / pouca incidência';
    const message =
      `Olá! Usei a calculadora de BTUs do site da DLS Refrigeração.\n\n` +
      `• Área: ${area} m²\n` +
      `• Pessoas: ${people}\n` +
      `• Incidência de sol: ${sunText}\n` +
      `• Equipamentos eletrônicos: ${equip ? 'sim' : 'não'}${equipDesc ? ` — ${equipDesc}` : ''}\n\n` +
      `Resultado: ${formatBTU(recommended)} BTUs` +
      (needsProject ? ' (ambiente grande, preciso de um projeto sob medida)' : '') +
      `.\n\nGostaria de um orçamento.`;

    whatsBtn.href = waLink(message);

    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  /* ==========================================================
     MODAL DE PRÉ-ATENDIMENTO (cards de serviço)
     ========================================================== */
  const modal = document.getElementById('serviceModal');
  const modalTitle = document.getElementById('modalTitle');
  const serviceForm = document.getElementById('serviceForm');
  const sfError = document.getElementById('sfError');
  let currentService = '';
  let lastFocus = null;

  const formView = document.getElementById('modalFormView');
  const successView = document.getElementById('modalSuccess');
  const dialog = modal.querySelector('.modal__dialog');
  const protocolCode = document.getElementById('protocolCode');
  const copyBtn = document.getElementById('copyProtocol');
  const reopenWa = document.getElementById('reopenWa');
  const lastWrap = document.getElementById('lastProtoWrap');
  const viewLast = document.getElementById('viewLast');
  const STORAGE_KEY = 'dls_ultimo_protocolo';

  const todayStamp = () => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  };
  const generateProtocol = () =>
    `DLS-${todayStamp()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

  const saveLast = (data) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* ignora */ }
  };
  const loadLast = () => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return data && data.date === todayStamp() ? data : null; // só o do dia
    } catch (e) { return null; }
  };

  const showForm = () => {
    successView.hidden = true;
    formView.hidden = false;
    dialog.setAttribute('aria-labelledby', 'modalTitle');
    const last = loadLast();
    lastWrap.hidden = !last;
    if (last) viewLast.textContent = last.protocol;
  };
  const showSuccess = (data) => {
    protocolCode.textContent = data.protocol;
    reopenWa.href = data.url;
    copyBtn.textContent = 'Copiar Protocolo';
    copyBtn.classList.remove('is-copied');
    formView.hidden = true;
    successView.hidden = false;
    dialog.setAttribute('aria-labelledby', 'successTitle');
    dialog.scrollTop = 0;
  };

  const openModal = (service) => {
    currentService = service;
    modalTitle.textContent = `Solicitar: ${service}`;
    sfError.hidden = true;
    showForm();
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
    setTimeout(() => document.getElementById('sfName').focus(), 50);
  };
  const closeModal = () => {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
    if (lastFocus) lastFocus.focus();
  };

  viewLast.addEventListener('click', () => {
    const last = loadLast();
    if (last) showSuccess(last);
  });
  copyBtn.addEventListener('click', async () => {
    const code = protocolCode.textContent;
    try {
      await navigator.clipboard.writeText(code);
    } catch (e) {
      const t = document.createElement('textarea');
      t.value = code; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch (err) { /* ignora */ }
      t.remove();
    }
    copyBtn.textContent = 'Copiado!';
    copyBtn.classList.add('is-copied');
    setTimeout(() => { copyBtn.textContent = 'Copiar Protocolo'; copyBtn.classList.remove('is-copied'); }, 2000);
  });

  document.querySelectorAll('.card--service').forEach((card) => {
    const open = () => openModal(card.dataset.service);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });
  modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  /* ---------- CEP: máscara + busca ViaCEP ---------- */
  const sfCep = document.getElementById('sfCep');
  const sfStreet = document.getElementById('sfStreet');
  const sfDistrict = document.getElementById('sfDistrict');
  const sfCity = document.getElementById('sfCity');
  const sfNumber = document.getElementById('sfNumber');
  const cepStatus = document.getElementById('sfCepStatus');
  let cepController = null;

  const setCepStatus = (text, cls = '') => {
    cepStatus.textContent = text;
    cepStatus.className = `field__hint ${cls}`.trim();
  };

  const fetchCep = async (digits) => {
    if (cepController) cepController.abort();
    cepController = new AbortController();
    setCepStatus('Buscando endereço...', 'is-loading');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: cepController.signal });
      if (!res.ok) throw new Error('http');
      const data = await res.json();
      if (data.erro) throw new Error('notfound');
      // Preenche só o que veio; campos continuam editáveis
      if (data.logradouro) sfStreet.value = data.logradouro;
      if (data.bairro) sfDistrict.value = data.bairro;
      if (data.localidade) sfCity.value = data.uf ? `${data.localidade}/${data.uf}` : data.localidade;
      setCepStatus('Endereço encontrado ✓', 'is-ok');
      sfNumber.focus();
    } catch (err) {
      if (err.name === 'AbortError') return;
      setCepStatus('CEP não encontrado. Preencha o endereço manualmente.');
    }
  };

  sfCep.addEventListener('input', () => {
    let d = sfCep.value.replace(/\D/g, '').slice(0, 8);
    sfCep.value = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
    if (d.length === 8) {
      fetchCep(d);
    } else {
      if (cepController) cepController.abort();
      setCepStatus('');
    }
  });

  serviceForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('sfName').value.trim();
    const model = document.getElementById('sfModel').value;
    const brand = document.getElementById('sfBrand').value;
    const type = document.getElementById('sfType').value;
    const msg = document.getElementById('sfMsg').value.trim();
    const cep = sfCep.value.trim();
    const street = sfStreet.value.trim();
    const number = sfNumber.value.trim();
    const comp = document.getElementById('sfComp').value.trim();
    const district = sfDistrict.value.trim();
    const city = sfCity.value.trim();

    const pay = document.getElementById('sfPay');
    const missing = !name ? document.getElementById('sfName') : !number ? sfNumber : !pay.value ? pay : null;
    if (missing) {
      sfError.hidden = false;
      missing.focus();
      return;
    }
    sfError.hidden = true;

    const addressLines = [
      `${street || 'Rua não informada'}, nº ${number}${comp ? ` — ${comp}` : ''}`,
      [district, city].filter(Boolean).join(' — '),
      cep ? `CEP ${cep}` : '',
    ].filter(Boolean).join('\n');

    const protocol = generateProtocol();
    const text =
      `*Protocolo: ${protocol}*\n` +
      `Olá, Denilson! Nova solicitação de atendimento pelo site da DLS Refrigeração.\n\n` +
      `*Serviço:* ${currentService}\n` +
      `*Cliente:* ${name}\n` +
      `*Modelo / Tipo:* ${model || 'Não informado'}\n` +
      `*Marca:* ${brand || 'Não informada'}\n` +
      `*Tipo de solicitação:* ${type}\n` +
      `*Relato:* ${msg || 'Não informado'}\n\n` +
      `*Local do atendimento:*\n${addressLines}\n\n` +
      `*Forma de pagamento preferida:* ${pay.value}\n\n` +
      `_Enviado pelo site._`;

    const url = waLink(text);
    saveLast({ protocol, date: todayStamp(), url });
    window.open(url, '_blank', 'noopener');
    serviceForm.reset();
    setCepStatus('');
    showSuccess({ protocol, url });
  });

  /* ---------- Mascote: fechar balão de fala ---------- */
  const mascotBubble = document.getElementById('mascotBubble');
  const mascotClose = document.getElementById('mascotClose');
  if (mascotBubble && mascotClose) {
    try { if (sessionStorage.getItem('dls_balao_fechado') === '1') mascotBubble.hidden = true; } catch (e) { /* ignora */ }
    mascotClose.addEventListener('click', () => {
      mascotBubble.hidden = true;
      try { sessionStorage.setItem('dls_balao_fechado', '1'); } catch (e) { /* ignora */ }
    });
  }
});