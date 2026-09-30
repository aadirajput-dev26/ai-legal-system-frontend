import { useEffect } from "react";

export const useEmbedScriptLoader = () => {
  useEffect(() => {
    // Function to close ViaSocket embed modal / remove injected elements
    const closeViasocketModal = () => {
      // Look for viasocket iframe, modal container, shadow host or dynamically injected elements
      const modalElements = document.querySelectorAll(
        '[id*="viasocket"], [class*="viasocket"], iframe[src*="viasocket"], div[id*="embed-component"]'
      );
      modalElements.forEach((el) => {
        if (el.id !== "viasocket-embed-main-script") {
          el.remove();
        }
      });

      // Remove close button overlay if present
      const btnContainer = document.getElementById("viasocket-close-btn-wrapper");
      if (btnContainer) btnContainer.remove();
    };

    // Attach global window.closeViasocket helper
    (window as any).closeViasocket = closeViasocketModal;

    // MutationObserver to watch for ViaSocket modal creation in document.body
    const observer = new MutationObserver(() => {
      const viasocketModalExists = Array.from(document.body.children).some((el) => {
        if (el.id === "viasocket-close-btn-wrapper" || el.id === "viasocket-embed-main-script") return false;
        const html = el.outerHTML || "";
        return (
          html.includes("viasocket") ||
          html.includes("embed-component") ||
          (el.tagName === "IFRAME" && (el as HTMLIFrameElement).src?.includes("viasocket"))
        );
      });

      const existingBtn = document.getElementById("viasocket-close-btn-wrapper");

      if (viasocketModalExists && !existingBtn) {
        const btnContainer = document.createElement("div");
        btnContainer.id = "viasocket-close-btn-wrapper";
        btnContainer.style.position = "fixed";
        btnContainer.style.top = "16px";
        btnContainer.style.right = "24px";
        btnContainer.style.zIndex = "999999";
        btnContainer.style.display = "flex";
        btnContainer.style.alignItems = "center";
        btnContainer.style.gap = "8px";

        const closeBtn = document.createElement("button");
        closeBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span style="font-weight: 600; font-size: 13px;">Close ViaSocket</span>
        `;
        closeBtn.style.backgroundColor = "#18181b";
        closeBtn.style.color = "#f4f4f5";
        closeBtn.style.border = "1px solid #3f3f46";
        closeBtn.style.borderRadius = "8px";
        closeBtn.style.padding = "8px 14px";
        closeBtn.style.cursor = "pointer";
        closeBtn.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)";
        closeBtn.style.display = "flex";
        closeBtn.style.alignItems = "center";
        closeBtn.style.gap = "6px";
        closeBtn.style.transition = "all 0.2s ease";

        closeBtn.onmouseenter = () => {
          closeBtn.style.backgroundColor = "#27272a";
          closeBtn.style.borderColor = "#52525b";
        };
        closeBtn.onmouseleave = () => {
          closeBtn.style.backgroundColor = "#18181b";
          closeBtn.style.borderColor = "#3f3f46";
        };

        closeBtn.onclick = closeViasocketModal;

        btnContainer.appendChild(closeBtn);
        document.body.appendChild(btnContainer);
      } else if (!viasocketModalExists && existingBtn) {
        existingBtn.remove();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Handle Escape key to close modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeViasocketModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const loadScript = (embedToken: string, callback?: () => void) => {
    if (!embedToken) return;

    // If script already exists and has the same token, just call the callback
    const existingScript = document.getElementById("viasocket-embed-main-script");
    if (existingScript && existingScript.getAttribute("embedToken") === embedToken) {
      if (callback) callback();
      return;
    }

    // Remove any stale script instance before mounting a new one
    if (existingScript) existingScript.remove();

    const script = document.createElement("script");
    script.id = "viasocket-embed-main-script";
    script.src = "https://embed.viasocket.com/prod-embedcomponent.js";
    script.setAttribute("embedToken", embedToken);

    script.onload = () => {
      if (callback) callback();
    };

    document.body.appendChild(script);
  };

  return { loadScript };
};

// Ensure window.openViasocket & closeViasocket exist in typescript
declare global {
  interface Window {
    openViasocket?: (scriptId: string | undefined, options: any) => void;
    closeViasocket?: () => void;
    handleClose?: () => void;
  }
}

