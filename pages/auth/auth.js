import { authApi } from "../../js/authApi.js";

// INVIO Authentication Logic

document.addEventListener("DOMContentLoaded", () => {
  const query = new URLSearchParams(window.location.search);
  const safeRedirect = getSafeRedirect(query.get("redirect"));
  const startMode = query.get("mode");

  // If already authenticated, skip auth page
  if (authApi.isAuthenticated()) {
    // FIX 1: Point to the exact HTML file
    window.location.href = safeRedirect || "/pages/dashboard/index.html";
    return;
  }

  // --- 1. Form Toggling (Login <-> Signup) ---
  const loginBox = document.getElementById("login-box");
  const signupBox = document.getElementById("signup-box");
  const goToSignupBtn = document.getElementById("go-to-signup");
  const goToLoginBtn = document.getElementById("go-to-login");

  function switchState(hideBox, showBox) {
    if (typeof gsap !== "undefined") {
      // GSAP Animation
      gsap.to(hideBox, {
        opacity: 0,
        y: -20,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          hideBox.classList.add("is-hidden");
          showBox.classList.remove("is-hidden");

          gsap.fromTo(
            showBox,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
          );
        },
      });
    } else {
      // Fallback if GSAP fails to load
      hideBox.classList.add("is-hidden");
      showBox.classList.remove("is-hidden");
    }
  }

  goToSignupBtn.addEventListener("click", (e) => {
    e.preventDefault();
    switchState(loginBox, signupBox);
  });

  goToLoginBtn.addEventListener("click", (e) => {
    e.preventDefault();
    switchState(signupBox, loginBox);
  });

  if (startMode === "signup") {
    loginBox.classList.add("is-hidden");
    signupBox.classList.remove("is-hidden");
  }

  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");

  const showMessage = (message, type = "info") => {
    const existing = document.querySelector(".auth-runtime-message");
    if (existing) existing.remove();

    const msg = document.createElement("div");
    msg.className = `auth-runtime-message auth-runtime-message--${type}`;
    msg.textContent = message;
    msg.style.margin = "0 0 1rem";
    msg.style.padding = "0.7rem 0.9rem";
    msg.style.borderRadius = "10px";
    msg.style.fontSize = "0.9rem";
    msg.style.fontWeight = "600";
    msg.style.background =
      type === "error" ? "rgba(220,53,69,0.12)" : "rgba(25,135,84,0.12)";
    msg.style.color = type === "error" ? "#b3261e" : "#0f5132";

    const target = !signupBox.classList.contains("is-hidden")
      ? signupBox.querySelector(".auth-header")
      : loginBox.querySelector(".auth-header");
    target?.after(msg);
  };

  const setSubmitting = (form, isSubmitting, label) => {
    const submitBtn = form?.querySelector("button[type='submit']");
    if (!submitBtn) return;
    submitBtn.disabled = isSubmitting;
    submitBtn.dataset.originalLabel =
      submitBtn.dataset.originalLabel || submitBtn.innerHTML;
    submitBtn.innerHTML = isSubmitting
      ? label
      : submitBtn.dataset.originalLabel;
  };

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email")?.value?.trim();
    const password = document.getElementById("login-password")?.value || "";

    if (!email || !password) {
      showMessage("Please enter email and password.", "error");
      return;
    }

    try {
      setSubmitting(loginForm, true, "Signing in...");
      await authApi.login(email, password);
      // FIX 2: Point to the exact HTML file
      window.location.href = safeRedirect || "/pages/dashboard/index.html";
    } catch (err) {
      showMessage(err.message || "Login failed.", "error");
    } finally {
      setSubmitting(loginForm, false, "Sign In");
    }
  });

  signupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const firstName =
      document.getElementById("signup-first")?.value?.trim() || "";
    const lastName =
      document.getElementById("signup-last")?.value?.trim() || "";
    const email = document.getElementById("signup-email")?.value?.trim();
    const password = document.getElementById("signup-password")?.value || "";
    const username = `${firstName} ${lastName}`.trim() || email;

    if (!email || !password) {
      showMessage("Please fill in all required fields.", "error");
      return;
    }

    try {
      setSubmitting(signupForm, true, "Creating account...");
      const result = await authApi.signup(email, password, username);

      if (result.session?.access_token) {
        // FIX 3: Point to the exact HTML file
        window.location.href = safeRedirect || "/pages/dashboard/index.html";
        return;
      }

      showMessage(
        "Account created. Please verify your email, then sign in.",
        "success",
      );
      switchState(signupBox, loginBox);
      document.getElementById("login-email").value = email;
    } catch (err) {
      showMessage(err.message || "Signup failed.", "error");
    } finally {
      setSubmitting(signupForm, false, "Create Account");
    }
  });

  // --- 2. Showcase Gallery Rotation ---
  const galleryImages = document.querySelectorAll(".gallery-img");
  let currentImageIndex = 0;

  if (galleryImages.length > 1) {
    setInterval(() => {
      // Remove active class from current image
      galleryImages[currentImageIndex].classList.remove("active");

      // Increment index
      currentImageIndex = (currentImageIndex + 1) % galleryImages.length;

      // Add active class to next image
      galleryImages[currentImageIndex].classList.add("active");
    }, 6000); // Rotate every 6 seconds
  }

  // --- 3. Initial Entrance Animation ---
  if (typeof gsap !== "undefined") {
    gsap.from(".auth-panel", {
      x: 50,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out",
    });

    gsap.from(".showcase-content > *", {
      y: 30,
      opacity: 0,
      duration: 1,
      stagger: 0.2,
      ease: "power3.out",
      delay: 0.3,
    });
  }
});

function getSafeRedirect(value) {
  if (!value) {
    return "";
  }

  if (value.startsWith("/")) {
    return value;
  }

  return "";
}