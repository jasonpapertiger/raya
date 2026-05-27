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

      // Force hide via inline styles before GSAP takes over
      banner.style.transform = 'translateY(100%)';
      banner.style.opacity = '0';
      banner.style.visibility = 'hidden';

      ScrollTrigger.create({
        start: 1600,
        end: 'max',
        onEnter: () => {
          banner.style.visibility = 'visible';
          gsap.to(banner, {
            y: '0%',
            opacity: 1,
            duration: 0.4,
            ease: 'power2.out',
          });
        },
        onLeaveBack: () =>
          gsap.to(banner, {
            y: '100%',
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in',
            onComplete: () => { banner.style.visibility = 'hidden'; },
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
            onComplete: () => { banner.style.visibility = 'hidden'; },
          }),
        onLeaveBack: () => {
          banner.style.visibility = 'visible';
          gsap.to(banner, {
            y: '0%',
            opacity: 1,
            duration: 0.4,
            ease: 'power2.out',
          });
        },
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
  });
})();