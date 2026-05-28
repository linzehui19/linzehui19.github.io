const root = document.documentElement;
const orb = document.querySelector(".cursor-orb");
const hero = document.querySelector(".hero");
const heroCopy = document.querySelector(".hero > .hero-copy");
const heroTitle = document.querySelector(".hero-title");
const revealTitle = document.querySelector(".reveal-title");
const navLinks = [...document.querySelectorAll("nav a")];
const hoverTargets = [...document.querySelectorAll("nav a, .lang-pill")];
const aboutJourney = document.querySelector(".about-journey");
const skillsSection = document.querySelector(".skills-section");
const publicationsSection = document.querySelector(".publications-section");
const contactSection = document.querySelector(".contact-section");
const resumeNodes = [...document.querySelectorAll(".resume-node")];
const skillCards = [...document.querySelectorAll(".skill-card")];
const skillScores = [...document.querySelectorAll(".skill-score")];
const publicationList = document.querySelector(".publication-list");
const publicationCards = [...document.querySelectorAll(".publication-card")];

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const pointer = {
  x: window.innerWidth * 0.58,
  y: window.innerHeight * 0.18,
};

let frameRequested = false;
let titleIsActive = true;
let lastMoveX = pointer.x;
let lastMoveY = pointer.y;
let lastMoveTime = performance.now();
let stretchSpeed = 0;
let stretchAngle = 0;
let cachedTitleRect = null;
let cachedOrbRadius = 100;
let revealIsActive = false;
let skillAutoProgress = 0;
let skillAutoStart = null;
let skillAutoActive = false;
const skillAutoDuration = 2600;

const nodeStops = {
  education: 0.23,
  research: 0.52,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function progressBetween(value, start, end) {
  return clamp((value - start) / (end - start), 0, 1);
}

function easeInOutCubic(value) {
  return value < 0.5 ? 4 * Math.pow(value, 3) : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function setVar(name, value) {
  root.style.setProperty(name, value);
}

function pageIsAtTop() {
  return window.scrollY <= 8;
}

function heroTitleIsVisible() {
  if (!heroTitle) return false;
  const rect = heroTitle.getBoundingClientRect();
  return rect.bottom > Number.parseFloat(getComputedStyle(root).getPropertyValue("--header-h")) && rect.top < window.innerHeight;
}

function syncScrollState() {
  root.classList.toggle("is-page-scrolled", !pageIsAtTop());
}

function syncActiveNav() {
  const sections = [
    { id: "about-journey", element: aboutJourney },
    { id: "skills", element: skillsSection },
    { id: "publications", element: publicationsSection },
    { id: "contact", element: contactSection },
  ].filter(({ element }) => element);

  const probe = window.scrollY + window.innerHeight * 0.36;
  let activeId = "";

  sections.forEach(({ id, element }) => {
    if (probe >= element.offsetTop) {
      activeId = id;
    }
  });

  if (pageIsAtTop()) activeId = "";

  navLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${activeId}`);
  });
}

function scrollTargetForProgress(section, progress, viewportLead) {
  if (!section) return 0;
  const travel = Math.max(section.offsetHeight - window.innerHeight, 1);
  const target = section.offsetTop - window.innerHeight * viewportLead + travel * progress;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  return clamp(target, 0, Math.max(maxScroll, 0));
}

function getNavigationTarget(hash) {
  const targets = {
    "#about-journey": {
      section: aboutJourney,
      progress: 0.13,
      viewportLead: 0.18,
    },
    "#skills": {
      section: skillsSection,
      progress: 0.2,
      viewportLead: 0.04,
    },
    "#publications": {
      section: publicationsSection,
      progress: 0.22,
      viewportLead: 0.16,
    },
    "#contact": {
      section: contactSection,
      progress: 0.28,
      viewportLead: 0.12,
    },
  };

  if (hash === "#home") return 0;
  const target = targets[hash];
  if (target?.section) {
    return scrollTargetForProgress(target.section, target.progress, target.viewportLead);
  }

  const fallback = document.querySelector(hash);
  if (!fallback) return null;
  const headerHeight = Number.parseFloat(getComputedStyle(root).getPropertyValue("--header-h")) || 0;
  return clamp(fallback.offsetTop - headerHeight, 0, document.documentElement.scrollHeight - window.innerHeight);
}

function handleNavigationClick(event) {
  const link = event.currentTarget;
  const hash = link.getAttribute("href");
  if (!hash?.startsWith("#")) return;

  const targetY = getNavigationTarget(hash);
  if (targetY === null) return;

  event.preventDefault();
  window.history.pushState(null, "", hash);
  window.scrollTo({
    top: targetY,
    behavior: reduceMotion ? "auto" : "smooth",
  });
  requestAnimationFrame(() => {
    syncScrollState();
    syncActiveNav();
  });
}

function updateSkillCounters(progress) {
  skillCards.forEach((card, index) => {
    const score = Number(card.dataset.score || 0);
    const label = card.dataset.scoreLabel || "proficiency";
    const currentScore = Math.round(score * progress);
    if (skillScores[index]) {
      skillScores[index].textContent = `${currentScore}% ${label}`;
    }
  });
}

function setSkillDetailProgress(progress) {
  const nextProgress = clamp(progress, 0, 1);
  setVar("--skills-radar-progress", nextProgress.toFixed(3));
  setVar("--skill-meter-progress", nextProgress.toFixed(3));
  updateSkillCounters(nextProgress);
}

function stepSkillAutoAnimation(timestamp) {
  if (!skillAutoActive) return;
  if (skillAutoStart === null) skillAutoStart = timestamp;

  const elapsed = timestamp - skillAutoStart;
  const nextProgress = easeInOutCubic(clamp(elapsed / skillAutoDuration, 0, 1));
  skillAutoProgress = nextProgress;
  setSkillDetailProgress(skillAutoProgress);

  if (elapsed < skillAutoDuration) {
    requestAnimationFrame(stepSkillAutoAnimation);
    return;
  }

  skillAutoProgress = 1;
  skillAutoActive = false;
  setSkillDetailProgress(1);
}

function startSkillAutoAnimation() {
  if (reduceMotion || skillAutoActive || skillAutoProgress >= 1) return;
  skillAutoActive = true;
  skillAutoStart = null;
  requestAnimationFrame(stepSkillAutoAnimation);
}

function resetSkillAutoAnimation() {
  skillAutoActive = false;
  skillAutoStart = null;
  skillAutoProgress = 0;
  setSkillDetailProgress(0);
}

function orbIntersectsTitle() {
  if (!heroTitle) return false;
  const rect = heroTitle.getBoundingClientRect();
  const radius = orb ? orb.offsetWidth / 2 : cachedOrbRadius;
  return (
    pointer.x + radius >= rect.left &&
    pointer.x - radius <= rect.right &&
    pointer.y + radius >= rect.top &&
    pointer.y - radius <= rect.bottom
  );
}

function updateCachedMetrics() {
  if (!heroCopy || !heroTitle) return null;
  const copyRect = heroCopy.getBoundingClientRect();
  cachedTitleRect = {
    left: copyRect.left + heroTitle.offsetLeft,
    top: copyRect.top + heroTitle.offsetTop,
    width: heroTitle.offsetWidth,
    height: heroTitle.offsetHeight,
  };
  cachedOrbRadius = orb ? orb.offsetWidth / 2 : cachedOrbRadius;
  const revealWidth = revealTitle ? revealTitle.offsetWidth : cachedTitleRect.width;
  setVar("--title-width", `${cachedTitleRect.width}px`);
  setVar("--title-height", `${cachedTitleRect.height}px`);
  setVar("--title-left", `${cachedTitleRect.left}px`);
  setVar("--title-top", `${cachedTitleRect.top}px`);
  setVar("--reveal-scale-x", `${(cachedTitleRect.width / Math.max(revealWidth, 1)).toFixed(3)}`);
  return cachedTitleRect;
}

function resetTitleMotion() {
  setVar("--title-x", "0px");
  setVar("--title-y", "0px");
  setVar("--title-tilt", "0deg");
  setVar("--title-yaw", "0deg");
  setVar("--title-pitch", "0deg");
  setVar("--title-scale-x", "1");
  setVar("--title-scale-y", "1");
  setVar("--subtitle-x", "0px");
  setVar("--subtitle-y", "0px");
  setVar("--subtitle-tilt", "0deg");
  setVar("--subtitle-yaw", "0deg");
  setVar("--subtitle-pitch", "0deg");
}

function setTitleMotion() {
  if (!heroTitle || reduceMotion || !titleIsActive) {
    resetTitleMotion();
    return;
  }

  const rect = cachedTitleRect || updateCachedMetrics();
  if (!rect) return;
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = (pointer.x - centerX) / (window.innerWidth * 0.5);
  const dy = (pointer.y - centerY) / (window.innerHeight * 0.5);
  const pull = clamp(1.08 - Math.hypot(dx, dy) * 0.34, 0.28, 1);

  const moveX = dx * 38 * pull;
  const moveY = dy * 26 * pull;
  const tilt = clamp(-dx * dy * 52 * pull, -13, 13);
  const yaw = clamp(-dx * 26 * pull, -21, 21);
  const pitch = clamp(dy * 10 * pull, -8, 8);
  const scaleX = 1 + Math.min(Math.abs(dx) * pull * 0.055, 0.045);
  const scaleY = 1 - Math.min(Math.abs(dx) * pull * 0.022, 0.018);

  setVar("--title-x", `${moveX.toFixed(2)}px`);
  setVar("--title-y", `${moveY.toFixed(2)}px`);
  setVar("--title-tilt", `${tilt.toFixed(2)}deg`);
  setVar("--title-yaw", `${yaw.toFixed(2)}deg`);
  setVar("--title-pitch", `${pitch.toFixed(2)}deg`);
  setVar("--title-scale-x", scaleX.toFixed(3));
  setVar("--title-scale-y", scaleY.toFixed(3));
  setVar("--subtitle-x", `${(moveX * 0.72).toFixed(2)}px`);
  setVar("--subtitle-y", `${(moveY * 0.72).toFixed(2)}px`);
  setVar("--subtitle-tilt", `${(tilt * 0.72).toFixed(2)}deg`);
  setVar("--subtitle-yaw", `${(yaw * 0.34).toFixed(2)}deg`);
  setVar("--subtitle-pitch", `${(pitch * 0.34).toFixed(2)}deg`);
}

function render() {
  frameRequested = false;
  if (!orb || reduceMotion) return;

  updateCachedMetrics();

  const stretch = clamp(1 + stretchSpeed / 6200, 1, 1.12);
  const squash = 1 - (stretch - 1) * 0.52;
  orb.style.transform = `translate3d(${pointer.x.toFixed(2)}px, ${pointer.y.toFixed(2)}px, 0) translate(-50%, -50%) rotate(${stretchAngle.toFixed(2)}deg) scale(${stretch.toFixed(3)}, ${squash.toFixed(3)})`;
  const radius = orb.classList.contains("is-pointer") ? 9 : cachedOrbRadius;
  setVar("--cursor-x", `${pointer.x.toFixed(2)}px`);
  setVar("--cursor-y", `${pointer.y.toFixed(2)}px`);
  setVar("--orb-rx", `${(radius * stretch).toFixed(2)}px`);
  setVar("--orb-ry", `${(radius * squash).toFixed(2)}px`);

  setTitleMotion();
  syncPointerContext();

  stretchSpeed *= 0.72;
  if (stretchSpeed > 12) requestRender();
}

function requestRender() {
  if (frameRequested) return;
  frameRequested = true;
  requestAnimationFrame(render);
}

function syncPointerContext(target = document.elementFromPoint(pointer.x, pointer.y)) {
  const currentTarget = target instanceof Element ? target : null;
  const inHeader = Boolean(currentTarget?.closest(".site-header"));
  const pointerDocumentY = window.scrollY + pointer.y;
  const inHero = hero
    ? pointerDocumentY >= hero.offsetTop && pointerDocumentY <= hero.offsetTop + hero.offsetHeight
    : false;
  const titleVisible = heroTitleIsVisible();
  const canRevealTitle = inHero && titleVisible && !inHeader;
  const nextRevealIsActive = canRevealTitle && orbIntersectsTitle();
  titleIsActive = canRevealTitle;
  revealIsActive = nextRevealIsActive;
  orb?.classList.toggle("is-pointer", !canRevealTitle);
  root.classList.toggle("is-title-reveal-active", revealIsActive);
}

function updateAboutPath() {
  if (!aboutJourney) return;

  let rawProgress = 1;
  let pathProgress = 1;
  let headingOpacity = 1;
  let headingY = 0;
  let pathReveal = 1;
  let aboutStageOpacity = 1;
  if (!reduceMotion) {
    const sectionTop = aboutJourney.offsetTop;
    const travel = Math.max(aboutJourney.offsetHeight - window.innerHeight, 1);
    rawProgress = clamp((window.scrollY - sectionTop + window.innerHeight * 0.18) / travel, 0, 1);

    const headingIn = progressBetween(rawProgress, 0, 0.16);
    headingOpacity = headingIn;
    headingY = (1 - headingIn) * 34;
    pathReveal = progressBetween(rawProgress, 0, 0.14);
    pathProgress = progressBetween(rawProgress, 0.02, 0.72);
  }

  if (skillsSection) {
    const skillsProgress = reduceMotion
      ? Number(window.scrollY >= skillsSection.offsetTop - window.innerHeight * 0.2)
      : progressBetween(rawProgress, 0.93, 0.995);
    aboutStageOpacity = 1 - skillsProgress;
  }

  setVar("--about-progress", pathProgress.toFixed(3));
  setVar("--about-heading-opacity", headingOpacity.toFixed(3));
  setVar("--about-heading-y", `${headingY.toFixed(1)}px`);
  setVar("--about-stage-opacity", aboutStageOpacity.toFixed(3));
  setVar("--path-reveal", pathReveal.toFixed(3));
  setVar("--path-y", `${((1 - pathReveal) * 28).toFixed(1)}px`);
  aboutJourney.classList.toggle("has-research", pathProgress >= nodeStops.research);
  aboutJourney.classList.toggle("is-complete", pathProgress >= 0.98);

  resumeNodes.forEach((node) => {
    const key = node.dataset.node;
    if (key === "education") {
      node.classList.toggle("is-visible", pathProgress >= nodeStops.education && pathProgress < nodeStops.research);
      return;
    }
    if (key === "research") {
      node.classList.toggle("is-visible", pathProgress >= nodeStops.research);
    }
  });
}

function updateSkillsSection() {
  if (!skillsSection) {
    setSkillDetailProgress(0);
    return;
  }

  let sectionProgress = 1;
  if (!reduceMotion) {
    const sectionTop = skillsSection.offsetTop;
    const travel = Math.max(skillsSection.offsetHeight - window.innerHeight, 1);
    sectionProgress = clamp((window.scrollY - sectionTop + window.innerHeight * 0.04) / travel, 0, 1);
  }

  const exitProgress = reduceMotion ? 0 : progressBetween(sectionProgress, 0.78, 0.94);
  const exitOpacity = 1 - exitProgress;
  const headingIn = reduceMotion ? 1 : progressBetween(sectionProgress, 0, 0.2);
  const layoutIn = reduceMotion ? 1 : progressBetween(sectionProgress, 0.18, 0.42);

  const headingOpacity = headingIn * exitOpacity;
  const layoutOpacity = layoutIn * exitOpacity;
  const pageY = (1 - headingIn) * 34 - exitProgress * 18;
  const layoutY = (1 - layoutIn) * 34 - exitProgress * 18;

  setVar("--skills-page-opacity", headingOpacity.toFixed(3));
  setVar("--skills-page-y", `${pageY.toFixed(1)}px`);
  setVar("--skills-heading-opacity", headingOpacity.toFixed(3));
  setVar("--skills-layout-opacity", layoutOpacity.toFixed(3));
  setVar("--skills-layout-y", `${layoutY.toFixed(1)}px`);

  if (reduceMotion) {
    skillAutoProgress = 1;
    setSkillDetailProgress(1);
    return;
  }

  if (sectionProgress < 0.18) {
    resetSkillAutoAnimation();
    return;
  }

  if (layoutIn >= 0.995 && exitProgress <= 0) {
    startSkillAutoAnimation();
  }

  setSkillDetailProgress(skillAutoProgress);
}

function updatePublicationsSection() {
  if (!publicationsSection) return;

  let sectionProgress = 1;
  if (!reduceMotion) {
    const sectionTop = publicationsSection.offsetTop;
    const travel = Math.max(publicationsSection.offsetHeight - window.innerHeight, 1);
    sectionProgress = clamp((window.scrollY - sectionTop + window.innerHeight * 0.16) / travel, 0, 1);
  }

  const exitProgress = reduceMotion ? 0 : progressBetween(sectionProgress, 0.975, 1);
  const exitOpacity = 1 - exitProgress;
  const headingIn = reduceMotion ? 1 : progressBetween(sectionProgress, 0, 0.12);
  const headingOut = reduceMotion ? 0 : progressBetween(sectionProgress, 0.28, 0.38);
  const listIn = reduceMotion ? 1 : progressBetween(sectionProgress, 0.1, 0.24);
  const listMove = reduceMotion ? 0 : progressBetween(sectionProgress, 0.38, 0.68);
  const cardGap = publicationList ? Number.parseFloat(getComputedStyle(publicationList).rowGap || "0") : 0;
  const cardHeight = publicationCards[0] ? publicationCards[0].offsetHeight : window.innerHeight * 0.29;
  const listShift = -listMove * ((cardHeight + cardGap) * 2);

  const headingOpacity = headingIn * (1 - headingOut) * exitOpacity;
  const listOpacity = listIn * exitOpacity;
  const headingY = (1 - headingIn) * 18 - headingOut * 72 - exitProgress * 18;
  const listY = (1 - listIn) * 20 - exitProgress * 18;

  setVar("--publications-heading-opacity", headingOpacity.toFixed(3));
  setVar("--publications-heading-y", `${headingY.toFixed(1)}px`);
  setVar("--publications-list-opacity", listOpacity.toFixed(3));
  setVar("--publications-list-y", `${listY.toFixed(1)}px`);
  setVar("--publications-list-shift", `${listShift.toFixed(1)}px`);
}

function updateContactSection() {
  if (!contactSection) return;

  let sectionProgress = 1;
  if (!reduceMotion) {
    const sectionTop = contactSection.offsetTop;
    const travel = Math.max(contactSection.offsetHeight - window.innerHeight, 1);
    sectionProgress = clamp((window.scrollY - sectionTop + window.innerHeight * 0.12) / travel, 0, 1);
  }

  const headingIn = reduceMotion ? 1 : progressBetween(sectionProgress, 0, 0.18);
  const cardsIn = reduceMotion ? 1 : progressBetween(sectionProgress, 0.16, 0.38);
  const endIn = reduceMotion ? 1 : progressBetween(sectionProgress, 0.72, 0.92);

  const headingY = (1 - headingIn) * 30;
  const cardsY = (1 - cardsIn) * 36;
  const endY = (1 - endIn) * 18;

  setVar("--contact-heading-opacity", headingIn.toFixed(3));
  setVar("--contact-heading-y", `${headingY.toFixed(1)}px`);
  setVar("--contact-cards-opacity", cardsIn.toFixed(3));
  setVar("--contact-cards-y", `${cardsY.toFixed(1)}px`);
  setVar("--contact-end-opacity", endIn.toFixed(3));
  setVar("--contact-end-y", `${endY.toFixed(1)}px`);
}

function resetPublicationCard(card) {
  card.classList.remove("is-tilted");
  card.style.setProperty("--pub-tilt-x", "0deg");
  card.style.setProperty("--pub-tilt-y", "0deg");
  card.style.setProperty("--pub-scale", "1");
}

window.addEventListener(
  "pointermove",
  (event) => {
    const now = performance.now();
    const dx = event.clientX - lastMoveX;
    const dy = event.clientY - lastMoveY;
    const dt = Math.max(now - lastMoveTime, 8);

    pointer.x = event.clientX;
    pointer.y = event.clientY;
    stretchSpeed = Math.hypot(dx, dy) / dt * 1000;
    if (Math.abs(dx) + Math.abs(dy) > 0.5) {
      stretchAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
    }
    lastMoveX = pointer.x;
    lastMoveY = pointer.y;
    lastMoveTime = now;

    const target = event.target instanceof Element ? event.target : null;
    const hoveredControl = target?.closest("nav a, .lang-pill");
    const hoveredSkillCard = target?.closest(".skill-card");
    const hoveredPublicationCard = target?.closest(".publication-card");
    syncPointerContext(target);

    hoverTargets.forEach((item) => {
      const isHovered = item === hoveredControl;
      item.classList.toggle("is-hovered", isHovered);
      item.style.backgroundColor = isHovered ? "rgba(0, 0, 0, 0.075)" : "";
      item.style.boxShadow = isHovered ? "inset 0 0 0 1px rgba(0, 0, 0, 0.04)" : "";
      item.style.color = isHovered ? "#000" : "";
    });

    skillCards.forEach((card) => {
      card.classList.toggle("is-flipped", card === hoveredSkillCard);
    });

    publicationCards.forEach((card) => {
      if (card !== hoveredPublicationCard || reduceMotion) {
        resetPublicationCard(card);
        return;
      }

      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.classList.add("is-tilted");
      card.style.setProperty("--pub-tilt-x", `${(y * 12).toFixed(2)}deg`);
      card.style.setProperty("--pub-tilt-y", `${(-x * 14).toFixed(2)}deg`);
      card.style.setProperty("--pub-scale", "1.035");
    });

    requestRender();
  },
  { passive: true },
);

skillCards.forEach((card) => {
  card.addEventListener("focus", () => card.classList.add("is-flipped"));
  card.addEventListener("blur", () => card.classList.remove("is-flipped"));
});

publicationCards.forEach((card) => {
  card.addEventListener("pointerleave", () => resetPublicationCard(card));
  card.addEventListener("blur", () => resetPublicationCard(card));
});

[document.querySelector(".brand"), ...navLinks].filter(Boolean).forEach((link) => {
  link.addEventListener("click", handleNavigationClick);
});

window.addEventListener("resize", () => {
  updateCachedMetrics();
  syncScrollState();
  syncActiveNav();
  updateAboutPath();
  updateSkillsSection();
  updatePublicationsSection();
  updateContactSection();
  requestRender();
});
window.addEventListener(
  "scroll",
  () => {
    updateCachedMetrics();
    syncScrollState();
    syncActiveNav();
    syncPointerContext();
    updateAboutPath();
    updateSkillsSection();
    updatePublicationsSection();
    updateContactSection();
    requestRender();
  },
  { passive: true },
);
window.addEventListener("load", () => {
  updateCachedMetrics();
  syncScrollState();
  syncActiveNav();
  updateAboutPath();
  updateSkillsSection();
  updatePublicationsSection();
  updateContactSection();
  requestRender();
});

updateCachedMetrics();
syncScrollState();
syncActiveNav();
syncPointerContext();
updateAboutPath();
updateSkillsSection();
updatePublicationsSection();
updateContactSection();
render();
