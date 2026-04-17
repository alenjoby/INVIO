/**
 * INVIO - Motion Engine
 * Powered by GSAP & Lenis
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize Lenis Smooth Scroll
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: "vertical",
    gestureOrientation: "vertical",
    smoothWheel: true,
    wheelMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // 2. Register GSAP Plugins
  gsap.registerPlugin(ScrollTrigger);

  // --- Next-Level Engine Modules ---

  // 1. Typography Motion (Character Splitter)
  function initTypography() {
    const headings = document.querySelectorAll(
      ".heading-primary, .process-step-title",
    );

    headings.forEach((heading) => {
      const text = heading.textContent;
      heading.innerHTML = "";

      // Wrap in lines and chars for premium mask reveal
      const chars = text
        .split("")
        .map((char) => {
          if (char === " ") return " ";
          return `<span class="split-char">${char}</span>`;
        })
        .join("");

      heading.innerHTML = chars;

      gsap.from(heading.querySelectorAll(".split-char"), {
        yPercent: 60,
        autoAlpha: 0,
        duration: 0.8,
        stagger: 0.012,
        ease: "power4.out",
        scrollTrigger: {
          trigger: heading,
          start: "top 90%",
          toggleActions: "play none none none",
        },
      });
    });
  }

  // 3. Dynamic Mood Tinting
  function initMoodEngine() {
    const filterBtns = document.querySelectorAll(
      ".badge-group button[data-filter]",
    );
    const searchInput = document.querySelector("#showcase-search");
    const templateGrid = document.querySelector(".template-grid");
    const emptyState = document.querySelector(".template-empty-state");
    const templateCards = document.querySelectorAll(
      ".template-grid .template-card, .template-grid .template-card-offset",
    );
    const root = document.documentElement;

    if (!filterBtns.length || !templateCards.length || !templateGrid) {
      return;
    }

    const moodColors = {
      all: "rgba(90, 15, 36, 0.18)",
      wedding: "rgba(90, 15, 36, 0.24)",
      birthday: "rgba(128, 44, 68, 0.2)",
      gala: "rgba(73, 12, 36, 0.2)",
    };

    function applyTemplateFilter() {
      const activeButton =
        document.querySelector(".badge-group .badge-active[data-filter]") ||
        filterBtns[0];
      const selectedFilter = activeButton?.dataset.filter || "all";
      const searchTerm = (searchInput?.value || "").trim().toLowerCase();

      let visibleCount = 0;

      templateCards.forEach((card) => {
        const category = (card.dataset.category || "").toLowerCase();
        const title = (card.dataset.title || "").toLowerCase();
        const tags = (card.dataset.tags || "").toLowerCase();

        const matchesFilter =
          selectedFilter === "all" || category === selectedFilter;
        const matchesSearch =
          !searchTerm || `${title} ${category} ${tags}`.includes(searchTerm);
        const shouldShow = matchesFilter && matchesSearch;

        card.hidden = !shouldShow;
        if (shouldShow) {
          visibleCount += 1;
        }
      });

      templateGrid.classList.toggle("is-empty", visibleCount === 0);
      if (emptyState) {
        emptyState.hidden = visibleCount !== 0;
      }

      const color = moodColors[selectedFilter] || moodColors.all;
      gsap.to(root, {
        "--mood-glow": color,
        duration: 0.8,
        ease: "power2.out",
      });
    }

    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterBtns.forEach((item) => {
          item.classList.remove("badge-active");
          item.classList.add("badge");
        });

        btn.classList.remove("badge");
        btn.classList.add("badge-active");
        applyTemplateFilter();
      });
    });

    if (searchInput) {
      searchInput.addEventListener("input", applyTemplateFilter);
    }

    applyTemplateFilter();
  }

  // 4. Template Preview Modal + CTA Actions
  function initTemplatePreviewModal() {
    const templateGrid = document.querySelector(".template-grid");
    const modal = document.getElementById("template-preview-modal");
    const modalImage = document.getElementById("template-preview-image");
    const modalCategory = document.getElementById("template-preview-category");
    const modalTitle = document.getElementById("template-preview-title");
    const modalPrice = document.getElementById("template-preview-price");
    const useButton = document.getElementById("template-preview-use");

    if (
      !templateGrid ||
      !modal ||
      !modalImage ||
      !modalCategory ||
      !modalTitle ||
      !modalPrice ||
      !useButton
    ) {
      return;
    }

    let activeTemplateId = "";

    function openModalFromCard(card) {
      const image = card.querySelector(".template-image-wrapper img");
      const category = card.querySelector(".template-category");
      const title = card.querySelector(".template-title");
      const price = card.querySelector(".template-price");

      if (!image || !category || !title || !price) {
        return;
      }

      activeTemplateId = card.dataset.templateId || "";
      modalImage.src = image.src;
      modalImage.alt = image.alt || title.textContent.trim();
      modalCategory.textContent = category.textContent.trim();
      modalTitle.textContent = title.textContent.trim();
      modalPrice.textContent = price.textContent.trim();

      modal.classList.remove("is-hidden");
      document.body.style.overflow = "hidden";
    }

    function closeModal() {
      modal.classList.add("is-hidden");
      document.body.style.overflow = "";
    }

    function goToEditor(templateId) {
      const id = templateId || "template";
      window.location.href = `/editor.html?template=${encodeURIComponent(id)}`;
    }

    templateGrid.addEventListener("click", (event) => {
      const card = event.target.closest(
        ".template-card, .template-card-offset",
      );
      if (!card || !templateGrid.contains(card) || card.hidden) {
        return;
      }

      const clickedButton = event.target.closest(".template-overlay-btn");

      if (clickedButton?.classList.contains("template-overlay-btn-primary")) {
        event.preventDefault();
        goToEditor(card.dataset.templateId || "");
        return;
      }

      openModalFromCard(card);
    });

    templateGrid.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      const card = event.target.closest(
        ".template-card, .template-card-offset",
      );
      if (!card || card.hidden) {
        return;
      }

      event.preventDefault();
      openModalFromCard(card);
    });

    modal.addEventListener("click", (event) => {
      if (event.target.closest('[data-modal-close="true"]')) {
        closeModal();
      }
    });

    useButton.addEventListener("click", () => {
      goToEditor(activeTemplateId);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.classList.contains("is-hidden")) {
        closeModal();
      }
    });
  }

  // 5. Parallax Background Blobs
  function initParallaxBlobs() {
    gsap.to(".glow-blob-1", {
      x: 24,
      y: 14,
      duration: 11,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });

    gsap.to(".glow-blob-2", {
      x: -20,
      y: -30,
      duration: 13,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });

    window.addEventListener("mousemove", (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 16;
      const y = (e.clientY / window.innerHeight - 0.5) * 16;

      gsap.to(".glow-blob", {
        x: x,
        y: y,
        duration: 1.4,
        ease: "power2.out",
        stagger: 0.1,
      });
    });
  }

  // 5. Original Section Reveals (Fallback for other elements)
  const revealElements = document.querySelectorAll(
    ".gsap-reveal:not(.process-item):not(.heading-primary)",
  );

  revealElements.forEach((el) => {
    gsap.fromTo(
      el,
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1.2,
        ease: "power4.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      },
    );
  });

  // Run Engines
  initTypography();
  initMoodEngine();
  initTemplatePreviewModal();
  initParallaxBlobs();

  // Specific Stagger for Process Items
  gsap.fromTo(
    ".process-item",
    {
      y: 60,
      opacity: 0,
      scale: 0.96,
    },
    {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 1.1,
      stagger: 0.18,
      ease: "power4.out",
      scrollTrigger: {
        trigger: ".process-staggered-grid",
        start: "top 70%",
        toggleActions: "play none none none",
      },
    },
  );

  // 6. Hero Parallax Effect
  gsap.to(".collage-col-1", {
    yPercent: -8,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero-section",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });

  gsap.to(".collage-col-2", {
    yPercent: 8,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero-section",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });

  // 7. Navbar Scrolled State
  const nav = document.querySelector(".nav-glass");
  ScrollTrigger.create({
    start: "top -50",
    onUpdate: (self) => {
      if (self.direction === 1) {
        nav.classList.add("nav-scrolled");
      } else {
        nav.classList.remove("nav-scrolled");
      }
    },
  });
});
