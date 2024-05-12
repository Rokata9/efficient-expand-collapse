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
    const elInner = el.querySelector(".content-inner");
    el.classList.remove("item--expanded");
    el.classList.remove("item--collapsed");
    elInner.classList.remove("item__contents--expanded");
    elInner.classList.remove("item__contents--collapsed");

    const sectionEl = el.closest(".expand-collapse-section");
    const sectionContent = sectionEl.querySelector(".content");
    sectionContent.style.display = "block"; // block to expand, has no effect on collapse (in the end of animation it gets set to none)
    const index = this._sections.indexOf(sectionEl);
    const targetContentHeight = sectionContent.offsetHeight + this._contentTopMargin;
    const lastSectionSibling = this._sections.slice(-1)[0].nextElementSibling;

    requestAnimationFrame(() => {
      if (expand) {
        el.classList.add("item--expanded");
        elInner.classList.add("item__contents--expanded");
      } else {
        el.classList.add("item--collapsed");
        elInner.classList.add("item__contents--collapsed");
      }

      const container = document.querySelector(".container");
      container.style.setProperty("--height", `${targetContentHeight}px`);

      for (let i = index + 1; i < this._sections.length; i++) {
        const curr = this._sections[i];
        curr.classList.add("animating");
      }
      lastSectionSibling.classList.add("animating");

      if (expand) {
        // For collapse animation -> use two set of classes for animation - animation-expand, animation-collapse
        // Update CSS with the correctly generated animation name for each case
        // Make sure to set display: none; on the content in end of animation

        sectionContent.addEventListener("animationend", () => {
          container.removeAttribute("style");

          for (let i = index + 1; i < this._sections.length; i++) {
            const curr = this._sections[i];
            curr.classList.remove("animating"); 
          }

          lastSectionSibling.classList.remove("animating");
        }, { once: true });
      }

      // if (!expand) {
      //   sectionContent.addEventListener("animationend", () => {
      //     sectionContent.style.display = "none";
  
      //     for (let i = index + 1; i < this._sections.length; i++) {
      //       const curr = this._sections[i];
      //       // avoid unexpected animations when removing transform inline style in the end of the animation, needs reflow
      //       curr.classList.add("notransition"); 
      //       // could also be set to translateY(0)
      //       curr.removeAttribute("style"); 
      //       // should force reflow here otherwise there will be no net change in notransition class which would animate transform, which we don't want,
      //       // we're just removing the unnecessary style attribute
      //       sectionEl.offsetHeight;
      //       curr.classList.remove("notransition");
      //     }

      //     lastSectionSibling.classList.add("notransition");
      //     lastSectionSibling.removeAttribute("style");
      //     sectionEl.offsetHeight;
      //     lastSectionSibling.classList.remove("notransition");
      //   }, { once: true });
      // }
    });
  }

  _createEaseAnimations() {
    let ease = document.querySelector(".ease");
    if (ease) {
      return ease;
    }

    ease = document.createElement("style");
    ease.classList.add("ease");

    console.log('------------- Expand animation --------------');
    const expandAnimation = [];
    const expandContentsAnimation = [];
    const collapseAnimation = [];
    const collapseContentsAnimation = [];
    const translateDownAnimation = [];
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

      // Translation down
      const translateStep = this._ease(i / 100);

      this._appendTranslation({
        i,
        step: translateStep,
        down: true,
        animation: translateDownAnimation
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
      }
      
      @keyframes translateContentAnimation {
        ${translateDownAnimation.join("")}
      }`;

    document.head.appendChild(ease);

    return ease;
  }

  _appendTranslation({ i, step, animation, down} = opts) {
    if (down) {
      if (i === 100) {
        animation.push(`
          ${i}% {
            transform: translateY(0);
          }`);
        return;
      }

      if (i === 0 || step === 0) {
        // No - for collapse
        animation.push(`
          ${i}% {
            transform: translateY(calc(-1 * var(--height)));
          }`);
        return;
      }

      // (1-step) should be without - in front for collapse
      animation.push(`
          ${i}% {
            transform: translateY(calc(${-(1 - step)} * var(--height)));
          }`);
    }
  }

  _append({ i, step, start, end, outerAnimation, innerAnimation } = opts) {
    let scale = start + (end - start) * step;
    let invScale = scale === 0 ? 0 : 1 / scale;

    console.log(`${i}: scale: ${scale}, inverse: ${invScale}, scale * inverse = ${scale * invScale}`);

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
