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
          gsap.to(nav, { backgroundColor: '#000000', duration: 0.3 });
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

        // If no children, animate the group element itself
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

        // Build animation slots
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

        // Set initial hidden state
        slots.forEach((slot) => {
          if (slot.type === 'item') {
            const isNestedSelf = slot.el.matches(
              '[data-reveal-group-nested]'
            );
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

        // Re-assert parent distance for nested parents
        slots.forEach((slot) => {
          if (slot.type === 'nested' && slot.includeParent) {
            gsap.set(slot.parentEl, { y: groupDistance });
          }
        });

        // Reveal sequence
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

    // Kill existing stacking ScrollTriggers
    ScrollTrigger.getAll().forEach((trigger) => {
      cardsSections.forEach((section) => {
        if (section.contains(trigger.trigger)) trigger.kill();
      });
    });

    // Reset card targets
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

    // Resize listener (registered once)
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
    const banner = document.querySelector('.promo-banner');
    const footer = document.querySelector('footer');
    if (!banner || !footer) return;

    // Set initial hidden state
    gsap.set(banner, { yPercent: 100, autoAlpha: 0 });

    // Show banner after 1600px of scroll
    ScrollTrigger.create({
      start: 1600,
      end: 'max',
      onEnter: () =>
        gsap.to(banner, {
          yPercent: 0,
          autoAlpha: 1,
          duration: 0.4,
          ease: 'power2.out',
        }),
      onLeaveBack: () =>
        gsap.to(banner, {
          yPercent: 100,
          autoAlpha: 0,
          duration: 0.3,
          ease: 'power2.in',
        }),
    });

    // Hide banner when footer comes into view
    ScrollTrigger.create({
      trigger: footer,
      start: 'top bottom',
      onEnter: () =>
        gsap.to(banner, {
          yPercent: 100,
          autoAlpha: 0,
          duration: 0.3,
          ease: 'power2.in',
        }),
      onLeaveBack: () =>
        gsap.to(banner, {
          yPercent: 0,
          autoAlpha: 1,
          duration: 0.4,
          ease: 'power2.out',
        }),
    });
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
  });
})();