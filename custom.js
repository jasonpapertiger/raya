(function () {
  'use strict';

  // ——— Register all GSAP plugins once ———
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, Observer);

  // ——— Lenis smooth scroll ———
  const lenis = new Lenis();

  // Sync Lenis with GSAP's ticker so ScrollTrigger stays in sync
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // ——— Split-text config ———
  const splitConfig = {
    lines: { duration: 0.8, stagger: 0.08 },
    words: { duration: 0.6, stagger: 0.06 },
    chars: { duration: 0.4, stagger: 0.01 },
  };

  // ——— Init: Navbar show/hide on scroll ———
  function initNavbar() {
    const nav = document.querySelector('.navbar');
    if (!nav) return;

    // Detect Transparent Dark variant by its Webflow variant class
    const isTransparentDark = nav.classList.contains('w-variant-ce0d0008-a985-44ad-1e96-a2fc061a227a');
    const scrolledBg = isTransparentDark ? '#ffffff' : '#000000';

    const showAnim = gsap
      .from(nav, {
        yPercent: -100,
        paused: true,
        duration: 0.3,
        ease: 'power2.out',
      })
      .progress(1);

    ScrollTrigger.create({
      start: 'top top',
      end: 'max',
      onUpdate: (self) => {
        if (self.direction === -1) {
          showAnim.play();
          gsap.to(nav, { backgroundColor: scrolledBg, duration: 0.3 });
        } else {
          showAnim.reverse();
        }

        if (self.scroll() <= 50) {
          gsap.to(nav, { backgroundColor: 'transparent', duration: 0.3 });
        }
      },
    });
  }

  // ——— Init: Masked text scroll reveal ———
  function initMaskTextScrollReveal() {
    document.querySelectorAll('[data-split="heading"]').forEach((heading) => {
      const type = heading.dataset.splitReveal || 'lines';
      const typesToSplit =
        type === 'lines'
          ? ['lines']
          : type === 'words'
            ? ['lines', 'words']
            : ['lines', 'words', 'chars'];

      SplitText.create(heading, {
        type: typesToSplit.join(', '),
        mask: 'lines',
        autoSplit: true,
        linesClass: 'line',
        wordsClass: 'word',
        charsClass: 'letter',
        onSplit: function (instance) {
          const targets = instance[type];
          const config = splitConfig[type];

          return gsap.from(targets, {
            yPercent: 110,
            duration: config.duration,
            stagger: config.stagger,
            ease: 'expo.out',
            scrollTrigger: {
              trigger: heading,
              start: 'clamp(top 80%)',
              once: true,
            },
          });
        },
      });
    });
  }

  // ——— Init: Footer parallax ———
  function initFooterParallax() {
    document.querySelectorAll('[data-footer-parallax]').forEach((el) => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: 'clamp(top bottom)',
          end: 'clamp(top top)',
          scrub: true,
        },
      });

      const inner = el.querySelector('[data-footer-parallax-inner]');
      const dark = el.querySelector('[data-footer-parallax-dark]');

      if (inner) {
        tl.from(inner, { yPercent: -25, ease: 'linear' });
      }

      if (dark) {
        tl.from(dark, { opacity: 0.5, ease: 'linear' }, '<');
      }
    });
  }

  // ——— Init: Content reveal on scroll ———
  function initContentRevealScroll() {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const ctx = gsap.context(() => {
      document.querySelectorAll('[data-reveal-group]').forEach((groupEl) => {
        const groupStaggerSec =
          (parseFloat(groupEl.getAttribute('data-stagger')) || 100) / 1000;
        const groupDistance =
          groupEl.getAttribute('data-distance') || '2em';
        const triggerStart =
          groupEl.getAttribute('data-start') || 'top 80%';
        const animDuration = 0.8;
        const animEase = 'power4.inOut';

        if (prefersReduced) {
          gsap.set(groupEl, { clearProps: 'all', y: 0, autoAlpha: 1 });
          return;
        }

        const directChildren = Array.from(groupEl.children).filter(
          (el) => el.nodeType === 1
        );

        if (!directChildren.length) {
          gsap.set(groupEl, { y: groupDistance, autoAlpha: 0 });
          ScrollTrigger.create({
            trigger: groupEl,
            start: triggerStart,
            once: true,
            onEnter: () =>
              gsap.to(groupEl, {
                y: 0,
                autoAlpha: 1,
                duration: animDuration,
                ease: animEase,
                onComplete: () => gsap.set(groupEl, { clearProps: 'all' }),
              }),
          });
          return;
        }

        const slots = [];
        directChildren.forEach((child) => {
          const nestedGroup =
            child.matches('[data-reveal-group-nested]')
              ? child
              : child.querySelector(':scope [data-reveal-group-nested]');

          if (nestedGroup) {
            const includeParent =
              child.getAttribute('data-ignore') !== 'true' &&
              (child.getAttribute('data-ignore') === 'false' ||
                nestedGroup.getAttribute('data-ignore') === 'false');

            const nestedChildren = Array.from(nestedGroup.children).filter(
              (el) =>
                el.nodeType === 1 &&
                el.getAttribute('data-ignore') !== 'true'
            );

            slots.push({
              type: 'nested',
              parentEl: child,
              nestedEl: nestedGroup,
              includeParent,
              nestedChildren,
            });
          } else {
            if (child.getAttribute('data-ignore') === 'true') return;
            slots.push({ type: 'item', el: child });
          }
        });

        slots.forEach((slot) => {
          if (slot.type === 'item') {
            const isNestedSelf = slot.el.matches('[data-reveal-group-nested]');
            const d = isNestedSelf
              ? groupDistance
              : slot.el.getAttribute('data-distance') || groupDistance;
            gsap.set(slot.el, { y: d, autoAlpha: 0 });
          } else {
            if (slot.includeParent) {
              gsap.set(slot.parentEl, { y: groupDistance, autoAlpha: 0 });
            }
            const nestedD =
              slot.nestedEl.getAttribute('data-distance') || groupDistance;
            slot.nestedChildren.forEach((target) =>
              gsap.set(target, { y: nestedD, autoAlpha: 0 })
            );
          }
        });

        slots.forEach((slot) => {
          if (slot.type === 'nested' && slot.includeParent) {
            gsap.set(slot.parentEl, { y: groupDistance });
          }
        });

        ScrollTrigger.create({
          trigger: groupEl,
          start: triggerStart,
          once: true,
          onEnter: () => {
            const tl = gsap.timeline();

            slots.forEach((slot, slotIndex) => {
              const slotTime = slotIndex * groupStaggerSec;

              if (slot.type === 'item') {
                tl.to(
                  slot.el,
                  {
                    y: 0,
                    autoAlpha: 1,
                    duration: animDuration,
                    ease: animEase,
                    onComplete: () =>
                      gsap.set(slot.el, { clearProps: 'all' }),
                  },
                  slotTime
                );
              } else {
                if (slot.includeParent) {
                  tl.to(
                    slot.parentEl,
                    {
                      y: 0,
                      autoAlpha: 1,
                      duration: animDuration,
                      ease: animEase,
                      onComplete: () =>
                        gsap.set(slot.parentEl, { clearProps: 'all' }),
                    },
                    slotTime
                  );
                }

                const nestedMs = parseFloat(
                  slot.nestedEl.getAttribute('data-stagger')
                );
                const nestedStaggerSec = isNaN(nestedMs)
                  ? groupStaggerSec
                  : nestedMs / 1000;

                slot.nestedChildren.forEach((nestedChild, nestedIndex) => {
                  tl.to(
                    nestedChild,
                    {
                      y: 0,
                      autoAlpha: 1,
                      duration: animDuration,
                      ease: animEase,
                      onComplete: () =>
                        gsap.set(nestedChild, { clearProps: 'all' }),
                    },
                    slotTime + nestedIndex * nestedStaggerSec
                  );
                });
              }
            });
          },
        });
      });
    });

    return () => ctx.revert();
  }

  // ——— Init: Scroll-to-anchor via Lenis ———
  function initScrollToAnchorLenis() {
    document.querySelectorAll('[data-anchor-target]').forEach((element) => {
      element.addEventListener('click', function () {
        const target = this.getAttribute('data-anchor-target');
        lenis.scrollTo(target, {
          easing: (x) =>
            x < 0.5
              ? 8 * x * x * x * x
              : 1 - Math.pow(-2 * x + 2, 4) / 2,
          duration: 1.2,
          offset: 0,
        });
      });
    });
  }

  // ——— Helper: Viewport tier detection ———
  function getCurrentViewportTier() {
    const width = window.innerWidth;
    if (width <= 479) return 'mobile-portrait';
    if (width <= 767) return 'mobile-landscape';
    if (width <= 991) return 'tablet';
    return 'desktop';
  }

  // ——— Helper: Width-only debounce ———
  function debounceOnWidthChange(fn, ms) {
    let last = innerWidth;
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (innerWidth !== last) {
          last = innerWidth;
          fn.apply(this, args);
        }
      }, ms);
    };
  }

  // ——— Init: Stacking sticky cards with bounce ———
  function initStackingStickyCardsBounce() {
    const cardsSections = document.querySelectorAll('[data-stacking-cards-init]');

    const currentTier = getCurrentViewportTier();
    window.viewportTier = currentTier;

    ScrollTrigger.getAll().forEach((trigger) => {
      cardsSections.forEach((section) => {
        if (section.contains(trigger.trigger)) trigger.kill();
      });
    });

    cardsSections.forEach((section) => {
      section.querySelectorAll('[data-stacking-card-target]').forEach((el) => {
        gsap.killTweensOf(el);
        gsap.set(el, { clearProps: 'all' });
      });
    });

    cardsSections.forEach((section) => {
      const tier = currentTier;

      const isEnabled =
        (tier === 'desktop' && section.dataset.stackingCardsDesktop === 'true') ||
        (tier === 'tablet' && section.dataset.stackingCardsTablet === 'true') ||
        ((tier === 'mobile-portrait' || tier === 'mobile-landscape') &&
          section.dataset.stackingCardsMobile === 'true');

      if (!isEnabled) return;

      const cards = Array.from(section.querySelectorAll('[data-stacking-card]'));
      if (!cards.length) return;

      const stickyTop = parseFloat(getComputedStyle(cards[0]).top) || 0;

      const rotateValues = (() => {
        if (tier === 'desktop') return parseRotateValues(section, 'data-stacking-cards-desktop-rotate');
        if (tier === 'tablet') return parseRotateValues(section, 'data-stacking-cards-tablet-rotate');
        return parseRotateValues(section, 'data-stacking-cards-mobile-rotate');
      })();

      const xValues = (() => {
        if (tier === 'desktop') return parseAxisValues(section, 'data-stacking-cards-desktop-x');
        if (tier === 'tablet') return parseAxisValues(section, 'data-stacking-cards-tablet-x');
        return parseAxisValues(section, 'data-stacking-cards-mobile-x');
      })();

      const yValues = (() => {
        if (tier === 'desktop') return parseAxisValues(section, 'data-stacking-cards-desktop-y');
        if (tier === 'tablet') return parseAxisValues(section, 'data-stacking-cards-tablet-y');
        return parseAxisValues(section, 'data-stacking-cards-mobile-y');
      })();

      cards.forEach((card, index) => {
        const targetEl = card.querySelector('[data-stacking-card-target]');
        if (!targetEl) return;

        const rotate = rotateValues[index % rotateValues.length];
        const x = xValues[index % xValues.length];
        const y = yValues[index % yValues.length];

        gsap.set(targetEl, {
          rotate: 0,
          x: 0,
          y: 0,
          scale: 1,
          zIndex: cards.length - index,
        });

        gsap.to(targetEl, {
          rotate,
          x,
          y,
          ease: 'power1.in',
          overwrite: 'auto',
          scrollTrigger: {
            id: `stacking-rotate-${index}`,
            trigger: card,
            start: 'top 75%',
            end: `top-=${stickyTop} top`,
            scrub: true,
          },
        });

        ScrollTrigger.create({
          id: `stacking-bounce-${index}`,
          trigger: card,
          start: `top-=${stickyTop} top`,
          onEnter: () => pulseElement(targetEl),
        });
      });
    });

    ScrollTrigger.refresh();

    function parseRotateValues(section, attr) {
      const fallback = [0, 4, -4];
      const values = (section.getAttribute(attr) || '')
        .split(',')
        .map((val) => parseFloat(val.trim()));
      return values.length >= 1 && values.every((v) => !isNaN(v)) ? values : fallback;
    }

    function parseAxisValues(section, attr) {
      const raw = section.getAttribute(attr);
      if (!raw) return ['0em', '0em', '0em'];
      const values = raw
        .split(',')
        .map((val) => val.trim())
        .filter((val) => val !== '');
      return values.length ? values : ['0em', '0em', '0em'];
    }

    if (!window._hasStackingResizeListener) {
      let last = getCurrentViewportTier();

      window.addEventListener(
        'resize',
        debounceOnWidthChange(() => {
          const next = getCurrentViewportTier();

          if (last !== next) {
            ScrollTrigger.getAll().forEach((t) => {
              if (t.vars?.id?.startsWith('stacking')) t.kill();
            });

            cardsSections.forEach((section) => {
              section.querySelectorAll('[data-stacking-card-target]').forEach((el) => {
                gsap.killTweensOf(el);
                gsap.set(el, { clearProps: 'all' });
              });
            });

            initStackingStickyCardsBounce();
          }

          last = next;
          window.viewportTier = next;
        }, 250)
      );

      window._hasStackingResizeListener = true;
    }

    function pulseElement(targetEl) {
      const width = targetEl.offsetWidth;
      const height = targetEl.offsetHeight;
      const fontSize = parseFloat(getComputedStyle(targetEl).fontSize);
      const stretchPx = 1.5 * fontSize;
      const targetScaleX = (width + stretchPx) / width;
      const targetScaleY = (height - stretchPx * 0.33) / height;

      const tl = gsap.timeline();
      tl.to(targetEl, {
        scaleX: targetScaleX,
        scaleY: targetScaleY,
        duration: 0.1,
        ease: 'power1.out',
      }).to(targetEl, {
        scaleX: 1,
        scaleY: 1,
        duration: 1,
        ease: 'elastic.out(1, 0.3)',
      });
    }
  }

  // ——— Init: Promo banner show/hide on scroll ———
  function initPromoBanner() {
    setTimeout(() => {
      const banner = document.querySelector('.promo-banner');
      const footer = document.querySelector('footer');
      if (!banner || !footer) return;

      // Force initial hidden state via inline styles
      gsap.set(banner, { y: '100%', opacity: 0, clearProps: 'visibility' });

      ScrollTrigger.create({
        start: 1600,
        end: 'max',
        onEnter: () =>
          gsap.to(banner, {
            y: '0%',
            opacity: 1,
            duration: 0.4,
            ease: 'power2.out',
            overwrite: true,
          }),
        onLeaveBack: () =>
          gsap.to(banner, {
            y: '100%',
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in',
            overwrite: true,
          }),
      });

      ScrollTrigger.create({
        trigger: footer,
        start: 'top bottom',
        onEnter: () =>
          gsap.to(banner, {
            y: '100%',
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in',
            overwrite: true,
          }),
        onLeaveBack: () =>
          gsap.to(banner, {
            y: '0%',
            opacity: 1,
            duration: 0.4,
            ease: 'power2.out',
            overwrite: true,
          }),
      });

      ScrollTrigger.refresh();
    }, 300);
  }

  // ——— Init: Vimeo background video ———
  function initVimeoBGVideo() {
    const vimeoPlayers = document.querySelectorAll('[data-vimeo-bg-init]');
    if (!vimeoPlayers.length) return;

    vimeoPlayers.forEach(function (vimeoElement, index) {
      const vimeoVideoID = vimeoElement.getAttribute('data-vimeo-video-id');
      if (!vimeoVideoID) return;

      const vimeoVideoURL = `https://player.vimeo.com/video/${vimeoVideoID}?api=1&background=1&autoplay=0&loop=1&muted=1`;
      vimeoElement.querySelector('iframe').setAttribute('src', vimeoVideoURL);

      const videoIndexID = 'vimeo-bg-index-' + index;
      vimeoElement.setAttribute('id', videoIndexID);

      const player = new Vimeo.Player(vimeoElement.id);
      let videoAspectRatio;

      if (vimeoElement.getAttribute('data-vimeo-update-size') === 'true') {
        player.getVideoWidth().then(function (width) {
          player.getVideoHeight().then(function (height) {
            videoAspectRatio = height / width;
            const beforeEl = vimeoElement.querySelector('.vimeo-bg__before');
            if (beforeEl) beforeEl.style.paddingTop = videoAspectRatio * 100 + '%';
          });
        });
      }

      function adjustVideoSizing() {
        const containerAspectRatio =
          (vimeoElement.offsetHeight / vimeoElement.offsetWidth) * 100;
        const iframeWrapper = vimeoElement.querySelector('.vimeo-bg__iframe-wrapper');
        if (iframeWrapper && videoAspectRatio) {
          iframeWrapper.style.width =
            containerAspectRatio > videoAspectRatio * 100
              ? `${(containerAspectRatio / (videoAspectRatio * 100)) * 100}%`
              : '';
        }
      }

      if (vimeoElement.getAttribute('data-vimeo-update-size') === 'true') {
        adjustVideoSizing();
        player.getVideoWidth().then(() =>
          player.getVideoHeight().then(() => adjustVideoSizing())
        );
      } else {
        adjustVideoSizing();
      }

      window.addEventListener('resize', adjustVideoSizing);

      player.on('play', function () {
        vimeoElement.setAttribute('data-vimeo-loaded', 'true');
      });

      function vimeoPlayerPlay() {
        vimeoElement.setAttribute('data-vimeo-activated', 'true');
        vimeoElement.setAttribute('data-vimeo-playing', 'true');
        player.play();
      }

      function vimeoPlayerPause() {
        player.pause();
      }

      if (vimeoElement.getAttribute('data-vimeo-autoplay') === 'false') {
        player.pause();
      } else {
        if (vimeoElement.getAttribute('data-vimeo-paused-by-user') === 'false') {
          function checkVisibility() {
            const rect = vimeoElement.getBoundingClientRect();
            const inView = rect.top < window.innerHeight && rect.bottom > 0;
            inView ? vimeoPlayerPlay() : vimeoPlayerPause();
          }
          checkVisibility();
          window.addEventListener('scroll', checkVisibility);
        }
      }

      player.on('pause', function () {
        vimeoElement.setAttribute('data-vimeo-playing', 'false');
      });

      const playBtn = vimeoElement.querySelector('[data-vimeo-control="play"]');
      if (playBtn) playBtn.addEventListener('click', vimeoPlayerPlay);

      const pauseBtn = vimeoElement.querySelector('[data-vimeo-control="pause"]');
      if (pauseBtn) {
        pauseBtn.addEventListener('click', function () {
          vimeoPlayerPause();
          if (vimeoElement.getAttribute('data-vimeo-autoplay') === 'true') {
            vimeoElement.setAttribute('data-vimeo-paused-by-user', 'true');
            window.removeEventListener('scroll', checkVisibility);
          }
        });
      }
    });
  }

  // ——— Init: Ether CRM form integration ———
  function initEtherForm() {
    const form = document.querySelector('[data-ether-form]');
    if (!form) return;

    const consentCheckbox = form.querySelector('[data-ether-consent]');
    const submitBtn = form.querySelector('[type="submit"]');
    const formWrap = form.closest('.w-form');
    const successDiv = formWrap?.querySelector('.w-form-done');
    const errorDiv = formWrap?.querySelector('.w-form-fail');

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      if (consentCheckbox && !consentCheckbox.checked) {
        consentCheckbox.closest('label')?.classList.add('is-error');
        return;
      }

      const originalText = submitBtn?.textContent || '';
      if (submitBtn) submitBtn.textContent = 'Submitting...';
      if (errorDiv) errorDiv.style.display = 'none';

      const formData = new FormData();

      const fields = {
        student_name:         '[name="student_name"]',
        parent_guardian_name: '[name="parent_guardian_name"]',
        email_id:             '[name="email_id"]',
        mobile_number:        '[name="mobile_number"]',
        admission_for_grade:  '[name="admission_for_grade"]',
        heard_about_us:       '[name="heard_about_us"]',
      };

      for (const [key, selector] of Object.entries(fields)) {
        const el = form.querySelector(selector);
        if (el) formData.append(key, el.value.trim());
      }

      // Country code from select (strip leading + for Ether API)
      const countryCodeEl = form.querySelector('[name="country_code"]');
      if (countryCodeEl) {
        formData.append('country_code', countryCodeEl.value.replace('+', ''));
      }

      formData.append('school_code', 'TSOR');
      formData.append('utm_source', 'website');
      formData.append('lead_source', 'website');

      try {
        const response = await fetch(
          'https://api.enrol.etherapp.in/enrol/api/lead/form/submit',
          {
            method: 'POST',
            headers: {
              'x-code': '456a540bf7195d860a195cd93e844a76643028eab72e70e8c88b32ec5124a07e',
              'source': 'tsor_s',
            },
            body: formData,
          }
        );

        const result = await response.json();

        if (response.ok && result.status === 'success') {
          if (successDiv) successDiv.style.display = 'block';
          if (form) form.style.display = 'none';
        } else {
          throw new Error(result.message || 'Submission failed');
        }
      } catch (err) {
        if (errorDiv) errorDiv.style.display = 'block';
        if (submitBtn) submitBtn.textContent = originalText;
        console.error('Ether form error:', err);
      }
    });

    if (consentCheckbox) {
      consentCheckbox.addEventListener('change', function () {
        if (this.checked) {
          this.closest('label')?.classList.remove('is-error');
        }
      });
    }
  }

  // ——— Init: RTE image rows ———
  function initRTEImageRows() {
    const RICH_TEXT_SELECTOR = '.w-richtext[rte-image-rows]';
    const WRAPPER_MARKER = '[row]';
    const NEW_WRAPPER_MARKER = '[new-row]';
    const WRAPPER_CLASS = 'rte-image-row';

    document.querySelectorAll(RICH_TEXT_SELECTOR).forEach((element) =>
      processRichTextElement(element)
    );

    function processRichTextElement(element) {
      const figureElements = element.querySelectorAll('figure');
      let currentWrapper = null;
      let previousMarker = false;

      figureElements.forEach((figure) => {
        const captionElements = figure.querySelectorAll('figcaption');
        if (!captionElements.length) return;

        captionElements.forEach((captionElement) => {
          const captionText = captionElement.textContent.trim();
          const isNewWrapper = captionText.includes(NEW_WRAPPER_MARKER);
          const isWrapper = captionText.includes(WRAPPER_MARKER);

          if ((isNewWrapper || !isWrapper) && currentWrapper)
            currentWrapper = null;

          if (!isWrapper && !isNewWrapper && !captionText.includes('['))
            return;

          if (isWrapper || isNewWrapper || previousMarker) {
            if (!currentWrapper) {
              currentWrapper = document.createElement('div');
              currentWrapper.classList.add(WRAPPER_CLASS);
              figure.replaceWith(currentWrapper);
            }

            currentWrapper.appendChild(figure);
            captionElement.textContent = captionText
              .replace(NEW_WRAPPER_MARKER, '')
              .replace(WRAPPER_MARKER, '')
              .trim();
          }

          previousMarker = isWrapper || isNewWrapper;
        });
      });
    }
  }


  // ——— Select options data ———
  const countryOptions = [
    { value: '+1', label: '(+1)' },
    { value: '+1', label: '(+1)' },
    { value: '+7', label: '(+7)' },
    { value: '+7', label: '(+7)' },
    { value: '+20', label: '(+20)' },
    { value: '+27', label: '(+27)' },
    { value: '+30', label: '(+30)' },
    { value: '+31', label: '(+31)' },
    { value: '+32', label: '(+32)' },
    { value: '+33', label: '(+33)' },
    { value: '+34', label: '(+34)' },
    { value: '+36', label: '(+36)' },
    { value: '+39', label: '(+39)' },
    { value: '+40', label: '(+40)' },
    { value: '+41', label: '(+41)' },
    { value: '+42', label: '(+42)' },
    { value: '+43', label: '(+43)' },
    { value: '+44', label: '(+44)' },
    { value: '+45', label: '(+45)' },
    { value: '+46', label: '(+46)' },
    { value: '+47', label: '(+47)' },
    { value: '+48', label: '(+48)' },
    { value: '+49', label: '(+49)' },
    { value: '+51', label: '(+51)' },
    { value: '+52', label: '(+52)' },
    { value: '+53', label: '(+53)' },
    { value: '+54', label: '(+54)' },
    { value: '+55', label: '(+55)' },
    { value: '+56', label: '(+56)' },
    { value: '+57', label: '(+57)' },
    { value: '+58', label: '(+58)' },
    { value: '+60', label: '(+60)' },
    { value: '+61', label: '(+61)' },
    { value: '+62', label: '(+62)' },
    { value: '+63', label: '(+63)' },
    { value: '+64', label: '(+64)' },
    { value: '+65', label: '(+65)' },
    { value: '+66', label: '(+66)' },
    { value: '+81', label: '(+81)' },
    { value: '+82', label: '(+82)' },
    { value: '+84', label: '(+84)' },
    { value: '+86', label: '(+86)' },
    { value: '+90', label: '(+90)' },
    { value: '+91', label: '(+91)', selected: true },
    { value: '+94', label: '(+94)' },
    { value: '+95', label: '(+95)' },
    { value: '+98', label: '(+98)' },
    { value: '+212', label: '(+212)' },
    { value: '+213', label: '(+213)' },
    { value: '+216', label: '(+216)' },
    { value: '+218', label: '(+218)' },
    { value: '+220', label: '(+220)' },
    { value: '+221', label: '(+221)' },
    { value: '+222', label: '(+222)' },
    { value: '+223', label: '(+223)' },
    { value: '+224', label: '(+224)' },
    { value: '+226', label: '(+226)' },
    { value: '+227', label: '(+227)' },
    { value: '+228', label: '(+228)' },
    { value: '+229', label: '(+229)' },
    { value: '+231', label: '(+231)' },
    { value: '+232', label: '(+232)' },
    { value: '+233', label: '(+233)' },
    { value: '+234', label: '(+234)' },
    { value: '+236', label: '(+236)' },
    { value: '+237', label: '(+237)' },
    { value: '+238', label: '(+238)' },
    { value: '+239', label: '(+239)' },
    { value: '+240', label: '(+240)' },
    { value: '+241', label: '(+241)' },
    { value: '+242', label: '(+242)' },
    { value: '+244', label: '(+244)' },
    { value: '+245', label: '(+245)' },
    { value: '+248', label: '(+248)' },
    { value: '+249', label: '(+249)' },
    { value: '+250', label: '(+250)' },
    { value: '+251', label: '(+251)' },
    { value: '+252', label: '(+252)' },
    { value: '+253', label: '(+253)' },
    { value: '+254', label: '(+254)' },
    { value: '+256', label: '(+256)' },
    { value: '+257', label: '(+257)' },
    { value: '+258', label: '(+258)' },
    { value: '+260', label: '(+260)' },
    { value: '+261', label: '(+261)' },
    { value: '+262', label: '(+262)' },
    { value: '+263', label: '(+263)' },
    { value: '+264', label: '(+264)' },
    { value: '+265', label: '(+265)' },
    { value: '+266', label: '(+266)' },
    { value: '+267', label: '(+267)' },
    { value: '+268', label: '(+268)' },
    { value: '+269', label: '(+269)' },
    { value: '+290', label: '(+290)' },
    { value: '+291', label: '(+291)' },
    { value: '+297', label: '(+297)' },
    { value: '+298', label: '(+298)' },
    { value: '+299', label: '(+299)' },
    { value: '+350', label: '(+350)' },
    { value: '+351', label: '(+351)' },
    { value: '+352', label: '(+352)' },
    { value: '+353', label: '(+353)' },
    { value: '+354', label: '(+354)' },
    { value: '+356', label: '(+356)' },
    { value: '+357', label: '(+357)' },
    { value: '+358', label: '(+358)' },
    { value: '+359', label: '(+359)' },
    { value: '+370', label: '(+370)' },
    { value: '+371', label: '(+371)' },
    { value: '+372', label: '(+372)' },
    { value: '+373', label: '(+373)' },
    { value: '+374', label: '(+374)' },
    { value: '+375', label: '(+375)' },
    { value: '+376', label: '(+376)' },
    { value: '+377', label: '(+377)' },
    { value: '+378', label: '(+378)' },
    { value: '+379', label: '(+379)' },
    { value: '+380', label: '(+380)' },
    { value: '+381', label: '(+381)' },
    { value: '+385', label: '(+385)' },
    { value: '+386', label: '(+386)' },
    { value: '+387', label: '(+387)' },
    { value: '+389', label: '(+389)' },
    { value: '+417', label: '(+417)' },
    { value: '+421', label: '(+421)' },
    { value: '+500', label: '(+500)' },
    { value: '+501', label: '(+501)' },
    { value: '+502', label: '(+502)' },
    { value: '+503', label: '(+503)' },
    { value: '+504', label: '(+504)' },
    { value: '+505', label: '(+505)' },
    { value: '+506', label: '(+506)' },
    { value: '+507', label: '(+507)' },
    { value: '+509', label: '(+509)' },
    { value: '+590', label: '(+590)' },
    { value: '+591', label: '(+591)' },
    { value: '+592', label: '(+592)' },
    { value: '+593', label: '(+593)' },
    { value: '+594', label: '(+594)' },
    { value: '+595', label: '(+595)' },
    { value: '+596', label: '(+596)' },
    { value: '+597', label: '(+597)' },
    { value: '+598', label: '(+598)' },
    { value: '+670', label: '(+670)' },
    { value: '+671', label: '(+671)' },
    { value: '+672', label: '(+672)' },
    { value: '+673', label: '(+673)' },
    { value: '+674', label: '(+674)' },
    { value: '+675', label: '(+675)' },
    { value: '+676', label: '(+676)' },
    { value: '+677', label: '(+677)' },
    { value: '+678', label: '(+678)' },
    { value: '+679', label: '(+679)' },
    { value: '+680', label: '(+680)' },
    { value: '+681', label: '(+681)' },
    { value: '+682', label: '(+682)' },
    { value: '+683', label: '(+683)' },
    { value: '+686', label: '(+686)' },
    { value: '+687', label: '(+687)' },
    { value: '+688', label: '(+688)' },
    { value: '+689', label: '(+689)' },
    { value: '+691', label: '(+691)' },
    { value: '+692', label: '(+692)' },
    { value: '+850', label: '(+850)' },
    { value: '+852', label: '(+852)' },
    { value: '+853', label: '(+853)' },
    { value: '+855', label: '(+855)' },
    { value: '+856', label: '(+856)' },
    { value: '+880', label: '(+880)' },
    { value: '+886', label: '(+886)' },
    { value: '+960', label: '(+960)' },
    { value: '+961', label: '(+961)' },
    { value: '+962', label: '(+962)' },
    { value: '+963', label: '(+963)' },
    { value: '+964', label: '(+964)' },
    { value: '+965', label: '(+965)' },
    { value: '+966', label: '(+966)' },
    { value: '+967', label: '(+967)' },
    { value: '+968', label: '(+968)' },
    { value: '+971', label: '(+971)' },
    { value: '+972', label: '(+972)' },
    { value: '+973', label: '(+973)' },
    { value: '+974', label: '(+974)' },
    { value: '+975', label: '(+975)' },
    { value: '+976', label: '(+976)' },
    { value: '+977', label: '(+977)' },
    { value: '+992', label: '(+992)' },
    { value: '+993', label: '(+993)' },
    { value: '+994', label: '(+994)' },
    { value: '+996', label: '(+996)' },
    { value: '+998', label: '(+998)' },
    { value: '+1242', label: '(+1242)' },
    { value: '+1246', label: '(+1246)' },
    { value: '+1264', label: '(+1264)' },
    { value: '+1268', label: '(+1268)' },
    { value: '+1284', label: '(+1284)' },
    { value: '+1340', label: '(+1340)' },
    { value: '+1345', label: '(+1345)' },
    { value: '+1441', label: '(+1441)' },
    { value: '+1473', label: '(+1473)' },
    { value: '+1649', label: '(+1649)' },
    { value: '+1664', label: '(+1664)' },
    { value: '+1758', label: '(+1758)' },
    { value: '+1787', label: '(+1787)' },
    { value: '+1809', label: '(+1809)' },
    { value: '+1868', label: '(+1868)' },
    { value: '+1869', label: '(+1869)' },
    { value: '+1876', label: '(+1876)' },
    { value: '+7880', label: '(+7880)' },
  ];

  const gradeOptions = [
    { value: 'Pre-K - EYP 1', label: 'Pre-K - EYP 1' },
    { value: 'L K G - EYP 2', label: 'L K G - EYP 2' },
    { value: 'U K G - EYP 3', label: 'U K G - EYP 3' },
    { value: 'Grade 1 - PYP 1', label: 'Grade 1 - PYP 1' },
    { value: 'Grade 2 - PYP 2', label: 'Grade 2 - PYP 2' },
    { value: 'Grade 3 - PYP 3', label: 'Grade 3 - PYP 3' },
    { value: 'Grade 4 - PYP 4', label: 'Grade 4 - PYP 4' },
    { value: 'Grade 5 - PYP 5', label: 'Grade 5 - PYP 5' },
    { value: 'Grade 6 - MYP 1', label: 'Grade 6 - MYP 1' },
    { value: 'Grade 7 - MYP 2', label: 'Grade 7 - MYP 2' },
    { value: 'Grade 8 - MYP 3', label: 'Grade 8 - MYP 3' },
    { value: 'Grade 9 - MYP 4', label: 'Grade 9 - MYP 4' },
    { value: 'Grade 11 - IBDP 1', label: 'Grade 11 - IBDP 1' },
    { value: 'Grade 12 - IBDP 2', label: 'Grade 12 - IBDP 2' },
  ];

  const sourceOptions = [
    { value: 'Community Events', label: 'Community Events' },
    { value: 'Edustoke', label: 'Edustoke' },
    { value: 'Email', label: 'Email' },
    { value: 'Facebook', label: 'Facebook' },
    { value: 'Friends - Reference', label: 'Friends - Reference' },
    { value: 'Google Ads', label: 'Google Ads' },
    { value: 'Google Search', label: 'Google Search' },
    { value: 'Hoardings', label: 'Hoardings' },
    { value: 'Instagram', label: 'Instagram' },
    { value: 'LinkedIn', label: 'LinkedIn' },
    { value: 'Newspaper', label: 'Newspaper' },
    { value: 'Parent - Reference', label: 'Parent - Reference' },
    { value: 'Pamphlet', label: 'Pamphlet' },
    { value: 'Relatives - Reference', label: 'Relatives - Reference' },
    { value: 'Staff - Reference', label: 'Staff - Reference' },
    { value: 'Sibling', label: 'Sibling' },
    { value: 'Walk-in', label: 'Walk-in' },
    { value: 'WhatsApp', label: 'WhatsApp' },
    { value: 'YouTube', label: 'YouTube' },
    { value: 'Yellow Slate', label: 'Yellow Slate' },
    { value: 'Others', label: 'Others' },
  ];

  // ——— Init: Populate select fields ———
  function populateSelect(selector, placeholder, options) {
    document.querySelectorAll('[data-select="' + selector + '"]').forEach((el) => {
      el.innerHTML = '';
      const placeholderOption = document.createElement('option');
      placeholderOption.value = '';
      placeholderOption.textContent = placeholder;
      placeholderOption.disabled = true;
      placeholderOption.selected = true;
      el.appendChild(placeholderOption);
      options.forEach(({ value, label, selected }) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        if (selected) option.selected = true;
        el.appendChild(option);
      });
    });
  }

  function initSelectFields() {
    populateSelect('country-code', 'Country code', countryOptions);
    populateSelect('admission-grade', 'Admission for Grade*', gradeOptions);
    populateSelect('heard-about-us', 'How did you hear about us?', sourceOptions);
  }

  // ——— Single DOMContentLoaded ———
  document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initMaskTextScrollReveal();
    initFooterParallax();
    initContentRevealScroll();
    initScrollToAnchorLenis();
    initStackingStickyCardsBounce();
    initPromoBanner();
    initVimeoBGVideo();
    initEtherForm();
    initRTEImageRows();
    initSelectFields();
    setTimeout(initSelectFields, 500);
  });
})();