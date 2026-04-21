/**
 * INVIO "Whisper" Page Transitions
 * A high-end, minimalist approach featuring a golden progress thread and soft crossfade.
 */

(async () => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return;

  const ACCENT_COLOR = "#c5a059"; // Brand Gold

  // 1. Ensure GSAP is loaded
  const loadGSAP = () => {
    return new Promise((resolve) => {
      if (window.gsap) return resolve(window.gsap);
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js";
      script.onload = () => resolve(window.gsap);
      document.head.appendChild(script);
    });
  };

  const gsap = await loadGSAP();

  // 2. Create and Inject Progress Bar
  const createProgressBar = () => {
    const bar = document.createElement("div");
    bar.id = "invio-progress-bar";
    Object.assign(bar.style, {
      position: "fixed",
      top: 0,
      left: 0,
      width: "0%",
      height: "3px",
      backgroundColor: ACCENT_COLOR,
      zIndex: 100000,
      boxShadow: `0 0 10px ${ACCENT_COLOR}66`,
      pointerEvents: "none",
      willChange: "width"
    });
    document.documentElement.appendChild(bar); // Append to HTML to keep outside body transitions
    return bar;
  };

  const progressBar = document.getElementById("invio-progress-bar") || createProgressBar();

  // 3. Entrance Transition (reveal the page)
  const entrance = () => {
    // Hide progress bar instantly if it was full
    gsap.set(progressBar, { width: "100%", opacity: 1 });
    gsap.to(progressBar, { 
      opacity: 0, 
      duration: 0.4, 
      delay: 0.1,
      onComplete: () => {
        gsap.set(progressBar, { width: "0%" });
        // Ensure body is visible and interactive
        document.body.style.opacity = "1";
        document.body.style.pointerEvents = "all";
      }
    });
  };

  // 4. Exit Transition (prepare for navigation)
  const exitAsPromise = (nextUrl) => {
    return new Promise((resolve) => {
      // Disable clicks
      document.body.style.pointerEvents = "none";

      const tl = gsap.timeline({
        onComplete: () => {
          window.location.href = nextUrl;
        }
      });

      // Grow progress bar
      tl.to(progressBar, {
        width: "100%",
        duration: 0.4,
        ease: "power2.inOut"
      });

      // Fade out and nudge up content
      tl.to(document.body, {
        opacity: 0,
        scale: 1.01,
        duration: 0.3,
        ease: "power2.inOut"
      }, 0);
    });
  };

  // Run entrance on load
  if (document.readyState === "complete") {
    entrance();
  } else {
    window.addEventListener("load", entrance);
  }

  // 5. Handle Links
  const shouldHandleLink = (link) => {
    if (!link || link.target === "_blank" || link.hasAttribute("download") || link.hasAttribute("data-no-transition")) {
      return false;
    }
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("tel:") || href.startsWith("mailto:")) {
      return false;
    }

    try {
      const url = new URL(link.href, window.location.href);
      return url.origin === window.location.origin && url.href !== window.location.href;
    } catch {
      return false;
    }
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (shouldHandleLink(link)) {
      event.preventDefault();
      exitAsPromise(link.href);
    }
  });

  // 6. Handle Browser Back (reset)
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      document.body.style.pointerEvents = "";
      gsap.set(document.body, { opacity: 1, scale: 1 });
      gsap.set(progressBar, { width: "0%", opacity: 0 });
    }
  });

  // 7. Global Shortcuts (Admin Dashboard: Ctrl + Alt + D)
  window.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "d") {
      event.preventDefault();
      exitAsPromise("/pages/admin/index.html");
    }
  });

})();
