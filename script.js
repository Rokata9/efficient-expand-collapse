"use strict";

class Expando {
  constructor() {
    this._el = document.querySelector(".content");
    const toggleEl = document.querySelectorAll(".section-header");
    this._toggleBtn = document.querySelector(".toggle");
    this._sections = [...document.querySelectorAll(".expand-collapse-section")];
    this._isExpanded = new Array(this._sections.length).fill(false);

    this._createEaseAnimations();

    toggleEl.forEach((el) => {
      el.addEventListener("click", (e) => {
        el.querySelector(".toggle").classList.toggle("expanded");
        const section = e.target.closest(".expand-collapse-section");
        const content = section.querySelector(".content");
        const idx = this._sections.indexOf(section);
        this.toggle(content, idx);
      });
    });

    // measure single content element's margin-top (they all have the same margin in CSS)
    const rgx = /(.+)px/;
    const marginTopPx = window.getComputedStyle(this._el, null).marginTop;
    const results = rgx.exec(marginTopPx);
    this._contentTopMargin = +results[1] || 0;
  }

  expand(el, sectionIdx) {
    if (this._isExpanded[sectionIdx]) {
      return;
    }

    this._isExpanded[sectionIdx] = true;

    this._applyAnimation(el, { expand: true });
  }

  collapse(el, sectionIdx) {
    if (!this._isExpanded[sectionIdx]) {
      return;
    }

    this._isExpanded[sectionIdx] = false;

    this._applyAnimation(el, { expand: false });
  }

  toggle(el, sectionIdx) {
    const expanded = this._isExpanded[sectionIdx];

    if (expanded) {
      return this.collapse(el, sectionIdx);
    }

    this.expand(el, sectionIdx);
  }

  _applyAnimation(el, { expand } = opts) {
    function setTranslation(el, { height, start, expand } = opts) {
      const translation = start ? (expand ? -height : 0) : expand ? 0 : -height;

      if (translation === 0) {
        el.removeAttribute("style");
      } else {
        el.style.transform = `translateY(${translation}px)`;
      }
    }

    function runWithoutTransition(el, elFunc) {
      el.classList.add("notransition");
      elFunc(el);
      // should force reflow here otherwise there will be no net change in notransition class which would animate transform, which we don't want,
      // we're just removing sthe unnecessary style attribute
      el.offsetHeight;
      el.classList.remove("notransition");
    }

    const elInner = el.querySelector(".content-inner");
    el.classList.remove("item--expanded");
    el.classList.remove("item--collapsed");
    elInner.classList.remove("item__contents--expanded");
    elInner.classList.remove("item__contents--collapsed");

    const sectionEl = el.closest(".expand-collapse-section");
    const sectionContent = sectionEl.querySelector(".content");
    sectionContent.style.display = "block"; // block to expand, has no effect on collapse (in the end of animation it gets set to none)
    const index = this._sections.indexOf(sectionEl);
    const targetContentHeight =
      sectionContent.offsetHeight + this._contentTopMargin;

    for (let i = index + 1; i < this._sections.length; i++) {
      const curr = this._sections[i];

      // don't animate yet translation of adjacent sections, just set initial value for animation
      runWithoutTransition(curr, (el) => {
        // setting section content to display block pushes the other items by its height as it has transform set, but it still occupies its original height
        // initial value for animation
        setTranslation(el, {
          height: targetContentHeight,
          start: true,
          expand,
        });
      });
    }

    // the rest of the content below the expandable sections
    const lastSectionSibling = this._sections.slice(-1)[0].nextElementSibling;
    runWithoutTransition(lastSectionSibling, (el) => {
      setTranslation(el, {
        height: targetContentHeight,
        start: true,
        expand,
      });
    });

    // without this it won't detect changes to transform, it'd be just 2 consecutive transfom changes,
    // which doesn't trigger the animation, only jumps to final value
    requestAnimationFrame(() => {
      if (expand) {
        el.classList.add("item--expanded");
        elInner.classList.add("item__contents--expanded");
      } else {
        el.classList.add("item--collapsed");
        elInner.classList.add("item__contents--collapsed");
      }

      for (let i = index + 1; i < this._sections.length; i++) {
        const curr = this._sections[i];

        // trigger translation animation of adjacent sections and rest of the content now
        curr.classList.add(expand ? "expanded" : "collapsed");
        setTranslation(curr, {
          height: targetContentHeight,
          start: false,
          expand,
        });
      }
      
      lastSectionSibling.classList.add(expand ? "expanded" : "collapsed");
      setTranslation(lastSectionSibling, {
        height: targetContentHeight,
        start: false,
        expand,
      });

      if (!expand) {
        sectionContent.addEventListener(
          "animationend",
          () => {
            sectionContent.style.display = "none";

            for (let i = index + 1; i < this._sections.length; i++) {
              const curr = this._sections[i];
              // avoid unexpected animations when removing transform inline style in the end of the animation, needs reflow
              runWithoutTransition(curr, (el) => {
                // could also be set to translateY(0)
                el.removeAttribute("style");
                el.classList.remove("collapsed");
              });
            }

            runWithoutTransition(lastSectionSibling, (el) => {
              el.removeAttribute("style");
              el.classList.remove("collapsed");
            });
          },
          { once: true }
        );
      } else {
        sectionContent.addEventListener(
          "animationend",
          () => {
            for (let i = index + 1; i < this._sections.length; i++) {
              const curr = this._sections[i];
              // avoid unexpected animations when removing transform inline style in the end of the animation, needs reflow
              runWithoutTransition(curr, (el) => {
                el.classList.add("notransition");
                el.classList.remove("expanded");
              });
            }

            runWithoutTransition(lastSectionSibling, (el) => {
              el.classList.add("notransition");
              el.classList.remove("expanded");
            });
          },
          { once: true }
        );
      }
    });
  }

  _createEaseAnimations() {
    let ease = document.querySelector(".ease");
    if (ease) {
      return ease;
    }

    ease = document.createElement("style");
    ease.classList.add("ease");

    console.log("------------- Expand animation --------------");
    const expandAnimation = [];
    const expandContentsAnimation = [];
    const collapseAnimation = [];
    const collapseContentsAnimation = [];
    for (let i = 0; i <= 100; i++) {
      const step = this._ease(i / 100);

      // Expand animation.
      this._append({
        i,
        step,
        start: 0,
        end: 1,
        outerAnimation: expandAnimation,
        innerAnimation: expandContentsAnimation,
      });

      // Collapse animation.
      this._append({
        i,
        step,
        start: 1,
        end: 0,
        outerAnimation: collapseAnimation,
        innerAnimation: collapseContentsAnimation,
      });
    }

    ease.textContent = `
      @keyframes expandAnimation {
        ${expandAnimation.join("")}
      }

      @keyframes expandContentsAnimation {
        ${expandContentsAnimation.join("")}
      }

      @keyframes collapseAnimation {
        ${collapseAnimation.join("")}
      }

      @keyframes collapseContentsAnimation {
        ${collapseContentsAnimation.join("")}
      }`;

    document.head.appendChild(ease);
    return ease;
  }

  _append({ i, step, start, end, outerAnimation, innerAnimation } = opts) {
    let scale = start + (end - start) * step;
    let invScale = scale === 0 ? 0 : 1 / scale;

    outerAnimation.push(`
      ${i}% {
        transform: scaleY(${scale});
      }`);

    innerAnimation.push(`
      ${i}% {
        transform: scaleY(${invScale});
      }`);
  }

  _clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  _ease(v, pow = 4) {
    v = this._clamp(v, 0, 1);

    return 1 - Math.pow(1 - v, pow);
  }
}

new Expando();
