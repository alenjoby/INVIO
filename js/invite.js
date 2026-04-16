import { invitationsApi } from "./invitationsApi.js";

import { API_URL } from "./env.js";

const refs = {
  frame: document.getElementById("inviteFrame"),
  loader: document.getElementById("loader"),
  errorScreen: document.getElementById("errorScreen"),
  errorTitle: document.getElementById("errorTitle"),
  errorText: document.getElementById("errorText"),
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  const params = new URLSearchParams(window.location.search);
  let slug = params.get("slug");

  if (!slug) {
    const pathSegments = window.location.pathname.split("/").filter(Boolean);
    if (pathSegments.length > 0) {
      slug = pathSegments[pathSegments.length - 1];
    }
  }

  if (!slug || slug === "invite" || slug === "invite.html") {
    showError("Missing Link", "Open a published link with a slug in the URL.");
    return;
  }

  try {
    const invitation = await invitationsApi.getPublished(slug);

    // Update Document Title
    document.title = invitation.title || "INVIO | Invitation";

    await loadTemplateToFrame(invitation);
  } catch (error) {
    console.error("Failed to load invitation:", error);
    showError(
      "Invitation Not Found",
      error?.message ||
        "The invitation could not be loaded or is not published.",
    );
  }
}

async function loadTemplateToFrame(invitation) {
  try {
    const templateId = invitation.template_id;
    const templatePath = getTemplatePathById(templateId);

    if (!templatePath) throw new Error("Unknown template format");

    // Fetch Base Template HTML
    const templateUrl = new URL(templatePath, window.location.href).href;
    const response = await fetch(templateUrl, { cache: "no-store" });

    if (!response.ok) throw new Error("Failed to load template assets");

    const templateHtml = await response.text();
    const cleanHtml = stripTemplateScripts(templateHtml);
    const framedHtml = injectBaseHref(cleanHtml, templateUrl);

    // Prepare Iframe
    refs.frame.src = "about:blank";

    await new Promise((resolve) => {
      const checkReady = () => {
        try {
          const frameDoc = refs.frame.contentDocument;
          if (frameDoc && frameDoc.readyState === "complete") {
            resolve();
          } else {
            setTimeout(checkReady, 50);
          }
        } catch (e) {
          setTimeout(checkReady, 50);
        }
      };
      checkReady();
    });

    const frameDoc = refs.frame.contentDocument;
    frameDoc.open();
    frameDoc.write(framedHtml);
    frameDoc.close();

    // Wait for parse
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Hide scrollbars until loaded in frame
    injectViewerStyles(frameDoc);

    // Apply User Edits
    if (invitation.content?.edits) {
      applyEdits(frameDoc, invitation.content.edits);
    }

    // Apply Interactions
    if (invitation.interactions) {
      injectInteractions(frameDoc, invitation);
    }

    // Reveal
    setTimeout(() => {
      refs.loader.classList.add("hidden");
      refs.frame.style.visibility = "visible";
      refs.frame.style.opacity = "1";
      triggerFrameAnimations(frameDoc);
    }, 500);
  } catch (error) {
    throw error;
  }
}

function applyEdits(frameDoc, edits) {
  // First auto-register ids just like the Studio does
  autoRegisterEditableElements(frameDoc);

  const elements = frameDoc.querySelectorAll("[data-id]");
  elements.forEach((el) => {
    const id = el.getAttribute("data-id");
    const type = el.getAttribute("data-edit");

    if (type === "text" && edits.text && edits.text[id] !== undefined) {
      el.textContent = edits.text[id];
    } else if (
      type === "image" &&
      edits.images &&
      edits.images[id] !== undefined
    ) {
      el.src = edits.images[id];
    } else if (
      type === "color" &&
      edits.colors &&
      edits.colors[id] !== undefined
    ) {
      el.style.setProperty("--" + id, edits.colors[id]);
      if (el.style.color !== "") el.style.color = edits.colors[id];
    }
  });
}

function autoRegisterEditableElements(frameDoc) {
  // Mirrored perfectly from studio.js to ensure IDs match
  const usedIds = new Set(
    Array.from(frameDoc.querySelectorAll("[data-id]"))
      .map((el) => el.getAttribute("data-id"))
      .filter(Boolean),
  );

  frameDoc.querySelectorAll("img").forEach((img) => {
    if (img.hasAttribute("data-edit")) return;
    const seed = img.getAttribute("alt") || img.className || "image";
    const dataId = generateUniqueDataId(seed, usedIds, "image");
    img.setAttribute("data-edit", "image");
    img.setAttribute("data-id", dataId);
  });

  const textSelectors =
    "h1,h2,h3,h4,h5,h6,p,span,small,strong,em,a,li,label,button,figcaption,blockquote,td,th,div";
  frameDoc.querySelectorAll(textSelectors).forEach((el) => {
    if (el.hasAttribute("data-edit") || el.closest("[data-edit]")) return;

    // Quick validation check
    const text = el.textContent.replace(/\s+/g, " ").trim();
    if (!text || el.closest("script,style,noscript,head,svg,canvas,iframe"))
      return;

    const nonBreakChildren = Array.from(el.children).filter(
      (child) => child.tagName !== "BR",
    );
    if (el.tagName === "DIV" && nonBreakChildren.length > 0) return;
    if (el.children.length > 0 && nonBreakChildren.length > 1) return;
    if (text.length > 220 && el.tagName === "DIV") return;

    const seed = el.className || el.tagName.toLowerCase() || "text";
    const dataId = generateUniqueDataId(seed, usedIds, "text");
    el.setAttribute("data-edit", "text");
    el.setAttribute("data-id", dataId);
  });
}

function generateUniqueDataId(seed, usedIds, fallbackPrefix) {
  const normalizedSeed = String(seed || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const base = normalizedSeed || fallbackPrefix;
  let candidate = base;
  let counter = 2;
  while (usedIds.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

function getTemplatePathById(templateId) {
  const templateMap = {
    "academic-1": "templates/academic/academic 1.html",
    "academic-2": "templates/academic/academic 2.html",
    "academic-3": "templates/academic/academic 3.html",
    "birthday-1": "templates/birthday/birthday_template_1.html",
    "birthday-2": "templates/birthday/birthday_template_2.html",
    "birthday-3": "templates/birthday/birthday_template_3.html",
    "valentines-1": "templates/valentines/Template1.html",
    "valentines-2": "templates/valentines/Template2.html",
    "valentines-3": "templates/valentines/Template3.html",
    "wedding-1": "templates/wedding/wedding_template_1.html",
    "wedding-2": "templates/wedding/wedding_template_2.html",
    "wedding-3": "templates/wedding/wedding_template_3.html",
    "wedding-4": "templates/wedding/wedding_template_4.html",
    "wedding-5": "templates/wedding/wedding_template_5.html",
  };
  return templateMap[templateId] || "templates/wedding/wedding_template_1.html";
}

function getTemplateDesign(templateId, path) {
  const tid = path.split("/").pop().toLowerCase();
  const designs = {
    "wedding_template_1.html": {
      accent: "#d4af37",
      bg: "#ffffff",
      titleFont: "Playfair Display",
      bodyFont: "Baskervville",
      style:
        "border-radius: 0; border: 1px solid #d4af37; box-shadow: 0 10px 40px rgba(0,0,0,0.05);",
      mapFilter: "grayscale(1) contrast(1.2) brightness(0.9)",
    },
    "wedding_template_2.html": {
      accent: "#7c8c7c",
      bg: "#f9f7f2",
      titleFont: "Playfair Display",
      bodyFont: "Montserrat",
      style:
        "border-radius: 20px; border: none; box-shadow: 0 8px 30px rgba(0,0,0,0.03);",
      mapFilter: "sepia(20%) grayscale(0.5)",
    },
    "wedding_template_3.html": {
      accent: "#c5a059",
      bg: "#0a1a2f",
      titleFont: "Cormorant Garamond",
      bodyFont: "Montserrat",
      dark: true,
      style: "border-radius: 0; border: 2px solid #c5a059; padding: 60px;",
      mapFilter: "invert(90%) hue-rotate(180deg) grayscale(0.2)",
    },
    "wedding_template_4.html": {
      accent: "#e5baba",
      bg: "#fffcfc",
      titleFont: "Playfair Display",
      bodyFont: "Montserrat",
      style:
        "border-radius: 50px; border: 1px solid #f0e0e0; box-shadow: 0 10px 30px rgba(229,186,186,0.1);",
      mapFilter: "hue-rotate(-10deg) saturate(0.8)",
    },
    "wedding_template_5.html": {
      accent: "#5c0000",
      bg: "#e8dfd0",
      titleFont: "Mrs Saint Delafield",
      bodyFont: "Cormorant Garamond",
      style:
        "border-radius: 2px; border: none; box-shadow: 2px 2px 0 rgba(0,0,0,0.1); clip-path: polygon(0% 0%, 100% 0%, 98% 100%, 2% 98%);",
      mapFilter: "sepia(50%) contrast(1.1)",
    },
    "academic 1.html": {
      accent: "#ccff00",
      bg: "#0a0a0a",
      titleFont: "Orbitron",
      bodyFont: "Space Grotesk",
      dark: true,
      style:
        "border-radius: 12px; border: 1px solid #ccff00; backdrop-filter: blur(10px); box-shadow: 0 0 20px rgba(204,255,0,0.1);",
      mapFilter: "invert(100%) hue-rotate(180deg) brightness(0.8)",
    },
    "academic 2.html": {
      accent: "#00f2ff",
      bg: "#050505",
      titleFont: "Archivo Black",
      bodyFont: "Inter",
      dark: true,
      style:
        "border-radius: 0; border-left: 5px solid #00f2ff; background: rgba(255,255,255,0.02);",
      mapFilter: "invert(90%) hue-rotate(160deg)",
    },
    "academic 3.html": {
      accent: "#d4af37",
      bg: "#0a0b10",
      titleFont: "Playfair Display",
      bodyFont: "Space Grotesk",
      dark: true,
      style:
        "border-radius: 0; border-top: 1px solid #d4af37; border-bottom: 1px solid #d4af37;",
      mapFilter: "invert(100%) grayscale(100%) contrast(1.5)",
    },
    "birthday_template_1.html": {
      accent: "#ff5e78",
      bg: "#ffffff",
      titleFont: "Fredoka",
      bodyFont: "Montserrat",
      style:
        "border-radius: 25px; border: 4px solid #f0f0f0; transform: rotate(-1deg);",
      mapFilter: "saturate(1.5)",
    },
    "birthday_template_2.html": {
      accent: "#d4af37",
      bg: "#050505",
      titleFont: "hero2",
      bodyFont: "Montserrat",
      dark: true,
      style:
        "border-radius: 100px 100px 0 0; border: 1px solid rgba(212,175,55,0.2);",
      mapFilter: "grayscale(100%) brightness(0.7)",
    },
    "birthday_template_3.html": {
      accent: "#ffb6c1",
      bg: "#f3efe8",
      titleFont: "Courier New",
      bodyFont: "Courier New",
      style: "border-radius: 0; border: 2px dashed #ffb6c1; background: #fff;",
      mapFilter: "sepia(40%)",
    },
    "template1.html": {
      accent: "#ff003c",
      bg: "#0a0004",
      titleFont: "Playfair Display",
      bodyFont: "Space Grotesk",
      dark: true,
      style:
        "border-radius: 8px; border: 1px solid #ff003c; box-shadow: 0 0 30px rgba(255,0,60,0.2);",
      mapFilter: "invert(100%) hue-rotate(320deg) brightness(0.8)",
    },
    "template2.html": {
      accent: "#ff5c8d",
      bg: "#fff0f5",
      titleFont: "Plus Jakarta Sans",
      bodyFont: "Plus Jakarta Sans",
      style:
        "border-radius: 30px; border: 1px solid rgba(255,255,255,0.8); backdrop-filter: blur(20px);",
      mapFilter: "hue-rotate(330deg) saturate(1.2)",
    },
    "template3.html": {
      accent: "#d6336c",
      bg: "#1a1a24",
      titleFont: "Shadows Into Light",
      bodyFont: "Poppins",
      dark: true,
      style:
        "border-radius: 20px; border: none; box-shadow: 0 10px 40px rgba(0,0,0,0.3);",
      mapFilter: "invert(90%) hue-rotate(280deg)",
    },
  };
  return designs[tid] || designs["wedding_template_1.html"];
}

function injectInteractions(frameDoc, invitation) {
  if (!frameDoc || !frameDoc.body) return;

  const inter = invitation.interactions;
  if (!inter || (!inter.rsvp?.enabled && !inter.maps?.enabled)) return;

  const templatePath = getTemplatePathById(invitation.template_id);
  const design = getTemplateDesign(invitation.template_id, templatePath);

  let container = frameDoc.getElementById("__invio-interactions");
  if (!container) {
    container = frameDoc.createElement("div");
    container.id = "__invio-interactions";
    const firstScript = Array.from(frameDoc.body.children).find(
      (el) => el.tagName === "SCRIPT",
    );
    if (firstScript && firstScript.parentNode === frameDoc.body) {
      frameDoc.body.insertBefore(container, firstScript);
    } else {
      frameDoc.body.appendChild(container);
    }
  }

  const styleId = "__invio-interaction-styles";
  let styleEl = frameDoc.getElementById(styleId);
  if (!styleEl) {
    styleEl = frameDoc.createElement("style");
    styleEl.id = styleId;
    frameDoc.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    #__invio-interactions { padding: 100px 5%; text-align: center; }
    .invio-card { max-width: 700px; margin: 50px auto; padding: 60px 40px; background: ${design.bg}; color: ${design.dark ? "#fff" : "#333"}; font-family: ${design.bodyFont}, sans-serif; ${design.style} }
    .invio-title { font-family: ${design.titleFont}, serif; font-size: 3.5rem; color: ${design.accent}; margin-bottom: 30px; line-height: 1.1; }
    .invio-input { width: 100%; box-sizing: border-box; padding: 15px; margin-bottom: 20px; background: ${design.dark ? "rgba(255,255,255,0.05)" : "#fff"}; border: 1px solid ${design.dark ? "rgba(255,255,255,0.1)" : "#ddd"}; color: ${design.dark ? "#fff" : "#333"}; font-size: 1.1rem; outline: none; transition: 0.3s; border-radius: ${design.style.includes("border-radius") ? "8px" : "0"}; }
    .invio-input:focus { border-color: ${design.accent}; box-shadow: 0 0 15px ${design.accent}44; }
    .invio-btn { background: ${design.accent}; color: ${design.dark && design.accent !== "#ccff00" && design.accent !== "#00f2ff" ? "#fff" : "#000"}; border: none; padding: 18px 50px; font-family: inherit; font-size: 1.1rem; cursor: pointer; letter-spacing: 2px; text-transform: uppercase; margin-top: 20px; transition: 0.3s; border-radius: ${design.style.includes("border-radius") ? "50px" : "0"}; font-weight: 700; width: 100%; box-sizing: border-box;}
    .invio-btn:hover { transform: translateY(-3px); box-shadow: 0 10px 20px ${design.accent}66; }
    .invio-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
    .invio-map-wrap { margin-top: 40px; overflow: hidden; ${design.style} }
    .invio-map-iframe { width: 100%; height: 400px; border: none; filter: ${design.mapFilter}; transition: 0.8s; }
    .invio-map-iframe:hover { filter: none; }
    .invio-reveal { opacity: 0; transform: translateY(40px); transition: all 1.2s cubic-bezier(0.2, 0.8, 0.2, 1); }
    .invio-reveal.active { opacity: 1; transform: translateY(0); }
    .invio-success { background: rgba(34, 197, 94, 0.1); color: #22c55e; padding: 20px; border-radius: 8px; border: 1px solid rgba(34, 197, 94, 0.2); font-weight: 600; margin-top: 20px;}
  `;

  let html = "";
  if (inter.rsvp?.enabled) {
    html += `
      <div class="invio-card invio-reveal" data-invio-anim="reveal">
        <h2 class="invio-title">${inter.rsvp.title || "RSVP"}</h2>
        <form id="invio-rsvp-form">
          <input type="text" id="rsvp-name" class="invio-input" placeholder="Your Full Name" required>
          <input type="email" id="rsvp-email" class="invio-input" placeholder="Your Email address" required>
          <select id="rsvp-status" class="invio-input">
            <option value="attending">Joyfully Accepts</option>
            <option value="not_attending">Regretfully Declines</option>
          </select>
          <button class="invio-btn" type="submit" id="rsvp-submit">Send RSVP</button>
        </form>
        <div id="rsvp-success" class="invio-success" style="display: none;">
          Thank you! Your RSVP has been received.
        </div>
      </div>
    `;
  }

  if (inter.maps?.enabled) {
    let mapQuery = inter.maps.address || "Main Street";
    if (mapQuery.includes("google.com/maps")) {
      const placeMatch = mapQuery.match(/\/place\/([^\/\?]+)/);
      const coordMatch = mapQuery.match(/@(-?\d+\.\d+,-?\d+\.\d+)/);
      if (placeMatch)
        mapQuery = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
      else if (coordMatch) mapQuery = coordMatch[1];
    }
    const gMapUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`;
    html += `
      <div class="invio-card invio-reveal" data-invio-anim="reveal">
        <h2 class="invio-title">The Location</h2>
        <p style="margin-bottom: 25px; opacity: 0.8; font-size: 1.2rem;">${inter.maps.address || "No address provided"}</p>
        <div class="invio-map-wrap">
          <iframe class="invio-map-iframe" src="${gMapUrl}" allowfullscreen="" loading="lazy"></iframe>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;

  // Bind RSVP submit
  if (inter.rsvp?.enabled) {
    const rsvpForm = container.querySelector("#invio-rsvp-form");
    if (rsvpForm) {
      rsvpForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const btn = container.querySelector("#rsvp-submit");
        const name = container.querySelector("#rsvp-name").value;
        const email = container.querySelector("#rsvp-email").value;
        const status = container.querySelector("#rsvp-status").value;

        btn.disabled = true;
        btn.textContent = "Sending...";

        try {
          // Send to backend
          const response = await fetch(
            `${API_URL}/api/invitations/${invitation.id}/rsvp`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                guestName: name,
                guestEmail: email,
                rsvpStatus: status,
              }),
            },
          );

          if (!response.ok) throw new Error("Failed to submit RSVP");

          // Show success
          rsvpForm.style.display = "none";
          container.querySelector("#rsvp-success").style.display = "block";
        } catch (err) {
          console.error("RSVP Error:", err);
          alert(
            "Wait, there was an issue sending your RSVP. Please try again.",
          );
          btn.disabled = false;
          btn.textContent = "Send RSVP";
        }
      });
    }
  }

  triggerFrameAnimations(frameDoc);
}

function triggerFrameAnimations(frameDoc) {
  if (!frameDoc || !frameDoc.defaultView) return;
  const obs = new frameDoc.defaultView.IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("active");
      });
    },
    { threshold: 0.1 },
  );
  frameDoc.querySelectorAll(".invio-reveal").forEach((el) => obs.observe(el));
}

function injectViewerStyles(frameDoc) {
  const style = frameDoc.createElement("style");
  style.textContent = `
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      opacity: 1 !important;
      visibility: visible !important;
    }
  `;
  frameDoc.head.appendChild(style);
}

function injectBaseHref(html, templateUrl) {
  const baseTag = `<base href="${templateUrl}">`;
  if (/<base\s/i.test(html)) return html.replace(/<base\s[^>]*>/i, baseTag);
  if (/<head\b[^>]*>/i.test(html))
    return html.replace(/<head\b([^>]*)>/i, `<head$1>${baseTag}`);
  return `${baseTag}${html}`;
}

function stripTemplateScripts(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

function showError(title, message) {
  refs.loader.classList.add("hidden");
  refs.errorScreen.classList.add("visible");
  if (refs.errorTitle) refs.errorTitle.textContent = title;
  if (refs.errorText) refs.errorText.textContent = message;
}
