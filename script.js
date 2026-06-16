/* ==========================================================================
   Brandd Studio — interactions
   GSAP + ScrollTrigger only. Two moments of impact: hero lines + gallery.
   Everything else: restrained editorial reveals.
   ========================================================================== */

document.documentElement.classList.add('js');
gsap.registerPlugin(ScrollTrigger);

/* --------------------------------------------------------------------------
   0. HEADER — transparente no topo, frosted ao rolar
   -------------------------------------------------------------------------- */
(function headerScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  let ticking = false;
  function update() {
    header.classList.toggle('is-scrolled', window.scrollY > 80);
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();
})();

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --------------------------------------------------------------------------
   1. HERO vetor — turbulence distortion that reacts to the cursor.
   Moving the mouse pumps the feDisplacementMap scale up (very apparent);
   it decays smoothly back to flat when the cursor rests or leaves.
   -------------------------------------------------------------------------- */
(function heroVetorDistort() {
  const hero = document.querySelector('.hero');
  const svg = document.querySelector('.hero-vetor-svg');
  const turb = document.querySelector('#vetor-distort feTurbulence');
  const disp = document.querySelector('#vetor-distort feDisplacementMap');
  const spots = [
    document.querySelector('#vetor-spot-circle'),
    document.querySelector('#vetor-spot-circle-inv'),
  ];
  if (!hero || !svg || !turb || !disp || prefersReducedMotion) return;

  const VB_W = 7943.98, VB_H = 4021.33;
  const MAX_SCALE = 160; // displacement strength while the mouse moves
  let target = 0;
  let current = 0;
  let phase = 0;

  hero.addEventListener('pointermove', (e) => {
    target = MAX_SCALE;
    // map the cursor to viewBox coords so the warp spot sits under the mouse
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * VB_W;
    const y = ((e.clientY - r.top) / r.height) * VB_H;
    spots.forEach((c) => { if (c) { c.setAttribute('cx', x); c.setAttribute('cy', y); } });
  });
  hero.addEventListener('pointerleave', () => { target = 0; });

  gsap.ticker.add(() => {
    target *= 0.96; // decays unless pointermove keeps re-feeding it
    current += (target - current) * 0.08;
    if (current < 0.5 && target < 0.5) {
      if (disp.getAttribute('scale') !== '0') disp.setAttribute('scale', '0');
      return;
    }
    // drift the noise so the warp feels alive, not frozen
    phase += 0.012;
    turb.setAttribute('baseFrequency',
      `${(0.004 + Math.sin(phase) * 0.0015).toFixed(5)} ${(0.009 + Math.cos(phase * 0.8) * 0.002).toFixed(5)}`);
    disp.setAttribute('scale', current.toFixed(1));
  });
})();

/* --------------------------------------------------------------------------
   2. HERO headline — typewriter entrance (chars appear one by one),
   with a blinking caret that settles on the last line.
   -------------------------------------------------------------------------- */
(function typewriter() {
  const inners = Array.from(document.querySelectorAll('.hero-line-inner'));
  if (!inners.length) return;

  // split each line into character spans; hidden chars keep their layout
  // space so nothing reflows while the caret advances through them
  const chars = [];
  inners.forEach((line) => {
    const text = line.textContent;
    line.textContent = '';
    [...text].forEach((c) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = c;
      line.appendChild(s);
      chars.push(s);
    });
  });

  // inline blinking caret — lives in the text flow, always re-inserted
  // right after the last typed character (CSS handles the 530ms blink)
  const caret = document.createElement('span');
  caret.className = 'hero-caret';

  if (prefersReducedMotion) {
    inners[inners.length - 1].appendChild(caret);
    return;
  }

  gsap.set('.hero-tagline', { opacity: 0, y: 8 });
  chars.forEach((s) => { s.style.visibility = 'hidden'; });
  inners[0].insertBefore(caret, inners[0].firstChild);

  const TYPE_MS = 135; // slow, deliberate cadence
  let i = 0;
  function typeNext() {
    if (i >= chars.length) {
      // typewriter done — fade tagline in now
      gsap.to('.hero-tagline', { opacity: 1, y: 0, duration: 1.4, ease: 'power2.out' });
      return;
    }
    const s = chars[i++];
    s.style.visibility = 'visible';
    s.after(caret); // follows the char even across line breaks
    setTimeout(typeNext, TYPE_MS);
  }
  setTimeout(typeNext, 400);

  gsap.from('.hero-scroll', { opacity: 0, duration: 1, delay: 1.6 });
})();

/* --------------------------------------------------------------------------
   3. MENU MODAL — burger toggles a frosted full-screen overlay
   -------------------------------------------------------------------------- */
(function menuModal() {
  const burger = document.querySelector('.burger');
  const modal = document.querySelector('.menu-modal');
  if (!burger || !modal) return;

  const links = gsap.utils.toArray('.menu-link');
  let open = false;

  function setState(next) {
    open = next;
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    modal.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';

    if (open) {
      modal.classList.add('is-open');
      gsap.to(modal, { opacity: 1, duration: 0.45, ease: 'power2.out' });
      gsap.fromTo(links,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.07, delay: 0.08 }
      );
    } else {
      gsap.to(modal, {
        opacity: 0, duration: 0.35, ease: 'power2.in',
        onComplete: () => modal.classList.remove('is-open'),
      });
    }
  }

  burger.addEventListener('click', () => setState(!open));

  // close on link click, then let the anchor scroll to its section
  links.forEach((link) => link.addEventListener('click', () => setState(false)));

  // close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) setState(false);
  });
})();

/* --------------------------------------------------------------------------
   3b. SERVIÇOS — accordion (one open at a time, chevron rotates via CSS)
   -------------------------------------------------------------------------- */
(function servicosAccordion() {
  const items = Array.from(document.querySelectorAll('.servico'));
  if (!items.length) return;

  items.forEach((item) => {
    const btn = item.querySelector('.servico-toggle');
    btn.addEventListener('click', () => {
      const wasOpen = item.classList.contains('is-open');
      items.forEach((other) => {
        other.classList.remove('is-open');
        other.querySelector('.servico-toggle').setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
})();

/* --------------------------------------------------------------------------
   4. Editorial reveals — contained upward motion, smooth ease, no bounce
   -------------------------------------------------------------------------- */
gsap.utils.toArray('.reveal').forEach((el) => {
  // Fundador elements are handled below with stagger — skip them here
  if (el.closest('.fundador')) return;
  // These titles get word-by-word animation instead (block 4c)
  if (el.matches('.apoio-lead, .galeria-lead, .fechamento-title')) return;
  gsap.fromTo(el,
    { opacity: 0, y: 36, clipPath: 'inset(0 0 18% 0)' },
    {
      opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)',
      duration: 1.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    }
  );
});

/* --------------------------------------------------------------------------
   4b. FUNDADOR — staggered element-by-element entrance
   Photo slides in from the left; bio items cascade in from the right,
   each 0.18s after the previous, so the section feels choreographed.
   -------------------------------------------------------------------------- */
(function fundadorReveal() {
  const section = document.querySelector('.fundador');
  if (!section) return;

  const foto  = section.querySelector('.fundador-foto');
  const title = section.querySelector('h2');
  const body  = section.querySelector('p');
  const link  = section.querySelector('.fundador-link');

  // Photo: slides in from the left
  gsap.fromTo(foto,
    { opacity: 0, x: -48, clipPath: 'inset(0 12% 0 0)' },
    {
      opacity: 1, x: 0, clipPath: 'inset(0 0% 0 0)',
      duration: 1.2,
      ease: 'power3.out',
      scrollTrigger: { trigger: section, start: 'top 78%', once: true },
    }
  );

  // Bio items cascade in from slight y offset with stagger
  // title (h2) is handled by word-by-word reveal in block 4c — skip it here
  [body, link].forEach((el, i) => {
    if (!el) return;
    gsap.fromTo(el,
      { opacity: 0, y: 40, clipPath: 'inset(0 0 20% 0)' },
      {
        opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)',
        duration: 1.0,
        ease: 'power3.out',
        delay: 0.15 + i * 0.18,
        scrollTrigger: { trigger: section, start: 'top 78%', once: true },
      }
    );
  });
})();

/* --------------------------------------------------------------------------
   5. GALERIA — stacked frames, open-file-drawer (signature moment)
   -------------------------------------------------------------------------- */
(function gallery() {
  const cards = gsap.utils.toArray('.galeria-stack .card');
  if (!cards.length) return;

  const counterEl = document.querySelector('.galeria-counter-current');

  // initial drawer stack: slight downward offset + scale per depth
  cards.forEach((card, i) => {
    gsap.set(card, {
      y: i * 14,
      scale: 1 - i * 0.022,
      zIndex: cards.length - i,
      transformOrigin: 'center top',
    });
  });

  const tl = gsap.timeline({
    scrollTrigger: {
      // trigger on the pin block itself: the intro headline above it scrolls
      // away naturally before the stack pins to the viewport
      trigger: '.galeria-pin',
      start: 'top top',
      end: () => `+=${cards.length * 70}%`, // generous scroll runway
      pin: '.galeria-pin',
      scrub: 0.6,
      invalidateOnRefresh: true,
      onUpdate(self) {
        if (!counterEl) return;
        const idx = Math.min(cards.length, Math.floor(self.progress * cards.length) + 1);
        counterEl.textContent = String(idx).padStart(2, '0');
      },
    },
  });

  cards.forEach((card, i) => {
    if (i === cards.length - 1) return; // last card stays
    // top card slides up and away — the drawer opens
    tl.to(card, {
      // slide far enough to fully clear the viewport top, whatever the screen
      yPercent: () => {
        const h = card.offsetHeight || 1;
        return -(((window.innerHeight + h) / 2) / h) * 100 - 12;
      },
      rotation: i % 2 ? 1.6 : -1.6,
      ease: 'power2.inOut',
      duration: 1,
    }, i);
    // the rest of the stack settles forward one step
    cards.slice(i + 1).forEach((behind, j) => {
      tl.to(behind, {
        y: j * 14,
        scale: 1 - j * 0.022,
        ease: 'power2.inOut',
        duration: 1,
      }, i);
    });
  });
})();

/* --------------------------------------------------------------------------
   5b. TÍTULOS — entrada palavra a palavra com stagger
   Roda DEPOIS da galeria de propósito: o pin da galeria injeta um spacer
   grande no layout, então os triggers de .fundador/.fechamento (abaixo dela)
   só calculam a posição correta depois que o pin já existe.
   -------------------------------------------------------------------------- */
(function wordReveal() {
  function splitIntoWords(el) {
    const nodes = Array.from(el.childNodes);
    el.innerHTML = '';
    nodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/(\s+)/).forEach((part) => {
          if (/^\s+$/.test(part)) {
            el.appendChild(document.createTextNode(part));
          } else if (part.length) {
            const s = document.createElement('span');
            s.className = 'word-span';
            s.textContent = part;
            el.appendChild(s);
          }
        });
      } else {
        // Preserve element nodes (<br>, etc.) as-is
        el.appendChild(node.cloneNode(true));
      }
    });
    return Array.from(el.querySelectorAll('.word-span'));
  }

  const targets = [
    { sel: '.apoio-lead',       trigger: '.apoio-lead',    triggerStart: 'top 85%' },
    { sel: '.galeria-lead',     trigger: '.galeria-lead',  triggerStart: 'top 85%' },
    { sel: '.fechamento-title', trigger: '.fechamento',    triggerStart: 'top 78%' },
    { sel: '.fundador-bio h2',  trigger: '.fundador',      triggerStart: 'top 78%' },
  ];

  targets.forEach(({ sel, trigger, triggerStart }) => {
    const el = document.querySelector(sel);
    if (!el) return;
    const words = splitIntoWords(el);
    if (!words.length) return;
    gsap.fromTo(words,
      { opacity: 0, y: 20 },
      {
        opacity: 1, y: 0,
        duration: 1.46,
        ease: 'power3.out',
        stagger: 0.165,
        scrollTrigger: {
          trigger,
          start: triggerStart,
          once: true,
          onEnter: () => gsap.set(el, { opacity: 1, y: 0, clipPath: 'none' }),
        },
      }
    );
  });
})();

/* --------------------------------------------------------------------------
   6. ÍCONE B — self-drawing line-art on scroll (stroke-dashoffset)
   -------------------------------------------------------------------------- */
(function drawB() {
  const path = document.querySelector('.icone-b-path');
  if (!path) return;
  const length = path.getTotalLength();
  gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
  gsap.to(path, {
    strokeDashoffset: 0,
    ease: 'none',
    scrollTrigger: {
      trigger: '.oficio',
      // starts only when the section is well inside the viewport, and
      // stretches across a long scroll range so the drawing reads slowly
      start: 'top 45%',
      end: 'bottom 15%',
      scrub: 1.2,
    },
  });
})();

/* --------------------------------------------------------------------------
   Reduced motion: kill scroll-driven animation, show everything
   -------------------------------------------------------------------------- */
if (prefersReducedMotion) {
  ScrollTrigger.getAll().forEach((st) => st.kill());
  gsap.set('.reveal, .word-span, .hero-line-inner .ch, .hero-scroll', { clearProps: 'all', opacity: 1, y: 0 });
  gsap.set('.icone-b-path', { strokeDashoffset: 0 });
  gsap.set('.galeria-stack .card', { clearProps: 'all' });
}


/* ------------------------------------------------------------------------
   VÍDEO SCROLL SCRUB
   Atrela o tempo do bg-logo.mp4 à barra de rolagem
------------------------------------------------------------------------ */
(function initVideoScrub() {
  const video = document.querySelector("#hero-video");
  if (!video) return;

  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  if (isMobile) {
    // Mobile: autoplay 1x quando a seção entra na viewport, congela no fim
    if (prefersReducedMotion) return; // respeita reduced-motion — fica no poster

    video.pause();
    video.currentTime = 0;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {}); // autoplay bloqueado → poster permanece
          observer.disconnect();        // dispara só uma vez
        }
      });
    }, { threshold: 0.3 });

    // Congela no último frame ao terminar
    video.addEventListener('ended', () => {
      video.pause();
    }, { once: true });

    observer.observe(document.querySelector('#video-scrub-section'));

  } else {
    // Desktop: scroll-scrub com pin (comportamento original)
    function createScrollTrigger() {
      gsap.to(video, {
        currentTime: video.duration,
        ease: "none",
        scrollTrigger: {
          trigger: "#video-scrub-section",
          start: "top top",
          end: "+=300%",
          pin: true,
          scrub: true
        }
      });
    }

    if (video.readyState >= 1) {
      createScrollTrigger();
    } else {
      video.onloadedmetadata = createScrollTrigger;
    }
  }
})();

/* --------------------------------------------------------------------------
   Recalcula posições dos ScrollTriggers após o load completo (fontes/imagens
   assentadas). Corrige o pin da galeria que, sem isso, mede o layout cedo
   demais e deixa os cards encavalando a seção acima num reload.
   Só recomputa start/end — não altera animações, pin nem z-index.
   -------------------------------------------------------------------------- */
window.addEventListener('load', () => ScrollTrigger.refresh());