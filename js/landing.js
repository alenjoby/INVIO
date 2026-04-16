document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".site-header");
  const rsvpActions = document.querySelector(".rsvp-actions");
  const rsvpStatus = document.querySelector("[data-rsvp-status]");
  const countdownNodes = document.querySelectorAll("[data-countdown]");
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const updateHeaderState = () => {
    if (!header) {
      return;
    }

    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  if (typeof AOS !== "undefined") {
    AOS.init({
      duration: 820,
      easing: "ease-out-cubic",
      once: true,
      mirror: false,
      offset: 80,
      disable: prefersReducedMotion,
    });
  }

  const formatCountdown = (targetDate) => {
    const total = Math.max(0, targetDate.getTime() - Date.now());

    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((total / (1000 * 60)) % 60);

    return {
      days: String(days).padStart(2, "0"),
      hours: String(hours).padStart(2, "0"),
      minutes: String(minutes).padStart(2, "0"),
    };
  };

  const updateCountdown = (node) => {
    const target = new Date(node.dataset.countdown || "");
    const isValid = Number.isFinite(target.getTime());
    const unitMap = {
      days: node.querySelector("[data-countdown-value='days']"),
      hours: node.querySelector("[data-countdown-value='hours']"),
      minutes: node.querySelector("[data-countdown-value='minutes']"),
    };

    if (!isValid) {
      Object.values(unitMap).forEach((valueNode) => {
        if (valueNode) {
          valueNode.textContent = "--";
        }
      });
      return;
    }

    const values = formatCountdown(target);
    Object.entries(values).forEach(([key, value]) => {
      const valueNode = unitMap[key];
      if (valueNode) {
        valueNode.textContent = value;
      }
    });
  };

  const refreshCountdowns = () => {
    countdownNodes.forEach(updateCountdown);
  };

  const setActiveRsvp = (choice) => {
    if (!rsvpActions) {
      return;
    }

    const buttons = rsvpActions.querySelectorAll("[data-rsvp-choice]");
    buttons.forEach((button) => {
      const isActive = button.dataset.rsvpChoice === choice;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    if (rsvpStatus) {
      rsvpStatus.textContent =
        choice === "decline"
          ? "Response saved. Guests can still change their answer later."
          : "Great. The invite is now tracking your acceptance.";
    }
  };

  if (rsvpActions) {
    rsvpActions.addEventListener("click", (event) => {
      const button = event.target.closest("[data-rsvp-choice]");
      if (!button) {
        return;
      }

      setActiveRsvp(button.dataset.rsvpChoice || "accept");
    });
  }

  const init = () => {
    updateHeaderState();
    refreshCountdowns();
    setActiveRsvp("accept");
  };

  init();
  window.addEventListener("scroll", updateHeaderState, { passive: true });
  window.addEventListener("resize", refreshCountdowns, { passive: true });
  window.setInterval(refreshCountdowns, 1000);

  // Mobile Menu Toggle
  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");
  const siteNav = document.querySelector(".site-nav");

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", !isExpanded);
      navLinks.classList.toggle("is-open");
      siteNav.classList.toggle("menu-open");
    });
  }
});
