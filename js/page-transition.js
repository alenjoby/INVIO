(() => {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (prefersReducedMotion) {
    return;
  }

  const STYLE_ID = "__invio-page-transition-styles";
  const EXIT_CLASS = "page-is-leaving";

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      body {
        opacity: 0;
        transition: opacity 260ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      body.page-ready {
        opacity: 1;
      }

      body.${EXIT_CLASS} {
        opacity: 0;
      }
    `;
    document.head.appendChild(style);
  }

  const reveal = () => {
    requestAnimationFrame(() => {
      document.body.classList.add("page-ready");
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", reveal, { once: true });
  } else {
    reveal();
  }

  window.addEventListener("pageshow", () => {
    document.body.classList.add("page-ready");
    document.body.classList.remove(EXIT_CLASS);
  });

  const shouldHandleLink = (link) => {
    if (!link || link.target === "_blank" || link.hasAttribute("download")) {
      return false;
    }

    const href = link.getAttribute("href");
    if (!href || href.startsWith("#")) {
      return false;
    }

    try {
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) {
        return false;
      }

      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!shouldHandleLink(link)) {
      return;
    }

    event.preventDefault();
    const nextUrl = link.href;

    document.body.classList.add(EXIT_CLASS);

    window.setTimeout(() => {
      window.location.href = nextUrl;
    }, 170);
  });

  // ─── Global Shortcut: Ctrl + Alt + D (Admin Dashboard) ───
  window.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "d") {
      event.preventDefault();
      // Use the direct path for safety across all environments
      window.location.href = "/pages/admin/index.html";
    }
  });
})();
