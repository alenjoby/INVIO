import { authApi } from "../../js/authApi.js";

// INVIO Authentication Logic

document.addEventListener("DOMContentLoaded", async () => {
  const query = new URLSearchParams(window.location.search);
  const safeRedirect = getSafeRedirect(query.get("redirect"));
  const startMode = query.get("mode");

  // Verify session with server to avoid "ghost" redirects
  await authApi.syncSession();

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

  // --- 0. Check for "Just Signed Up" state ---
  const justSignedUp = localStorage.getItem("invio_just_signed_up");
  if (justSignedUp === "true" && !query.get("verified")) {
    showMessage("✦ Almost there! Please go to your Gmail and confirm the verification link to activate your account.", "success");
  }

  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");

  const showMessage = (message, type = "info") => {
    const existing = document.querySelector(".auth-runtime-message");
    if (existing) existing.remove();

    const msg = document.createElement("div");
    msg.className = `auth-runtime-message auth-runtime-message--${type}`;
    msg.textContent = message;
    msg.style.margin = "0 0 1.5rem";
    msg.style.padding = "1rem";
    msg.style.borderRadius = "12px";
    msg.style.fontSize = "0.95rem";
    msg.style.fontWeight = "500";
    msg.style.lineHeight = "1.4";
    msg.style.border = "1px solid";
    
    if (type === "error") {
      msg.style.background = "rgba(220,53,69,0.08)";
      msg.style.color = "#b3261e";
      msg.style.borderColor = "rgba(220,53,69,0.2)";
    } else {
      msg.style.background = "rgba(25,135,84,0.08)";
      msg.style.color = "#0f5132";
      msg.style.borderColor = "rgba(25,135,84,0.2)";
    }

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
      
      // Success! Clear the new user flag
      localStorage.removeItem("invio_just_signed_up");
      
      window.location.href = safeRedirect || "/pages/dashboard/index.html";
    } catch (err) {
      const errMsg = err.message || "";
      if (errMsg.toLowerCase().includes("confirm") || errMsg.toLowerCase().includes("verify")) {
        showMessage("✦ Your account is ready! Just check your Gmail and confirm the mail to start designing.", "success");
      } else {
        showMessage(errMsg || "Login failed.", "error");
      }
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
        window.location.href = safeRedirect || "/pages/dashboard/index.html";
        return;
      }

      // Mark as just signed up
      localStorage.setItem("invio_just_signed_up", "true");

      showMessage(
        "✦ Account created! Please go to your Gmail and confirm this mail to activate your INVIO studio.",
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

  // Check for verified parameter (from Supabase email redirect)
  if (query.get("verified") === "true") {
    localStorage.removeItem("invio_just_signed_up");
    showMessage("Email verified successfully! You can now sign in.", "success");
  }

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
  // --- 4. Password Visibility Toggle ---
  const passwordWrappers = document.querySelectorAll(".password-wrapper");
  passwordWrappers.forEach((wrapper) => {
    const input = wrapper.querySelector("input");
    const toggle = wrapper.querySelector(".password-toggle");
    const icon = toggle.querySelector("i");

    toggle.addEventListener("click", () => {
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";

      // Toggle icon classes
      icon.classList.toggle("ph-eye", !isPassword);
      icon.classList.toggle("ph-eye-slash", isPassword);

      // Maintain focus on input after toggle
      input.focus();
    });
  });
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
