// Simple in-place editor for templates (toggle with ?edit=1)
(function () {
  function isEditMode() {
    return (
      location.search.indexOf("edit=1") !== -1 ||
      window.INVIO_EDIT_MODE === true
    );
  }

  function makeEditable(el) {
    el.setAttribute("contenteditable", "true");
    el.classList.add("invio-editable");
    el.addEventListener("focus", () => el.classList.add("editing"));
    el.addEventListener("blur", () => el.classList.remove("editing"));
  }

  if (!isEditMode()) return;

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-editable]").forEach(makeEditable);

    // simple save button
    const toolbar = document.createElement("div");
    toolbar.style.position = "fixed";
    toolbar.style.right = "12px";
    toolbar.style.top = "12px";
    toolbar.style.zIndex = 9999;
    toolbar.innerHTML =
      '<button id="invio-save" style="padding:8px 12px">Save (download)</button>';
    document.body.appendChild(toolbar);

    document.getElementById("invio-save").addEventListener("click", () => {
      const payload = {};
      document.querySelectorAll("[data-editable]").forEach((el) => {
        payload[
          el.getAttribute("data-key") ||
            el.id ||
            el.tagName + "_" + Math.random()
        ] = el.innerHTML;
      });
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template-edit.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  });
})();
