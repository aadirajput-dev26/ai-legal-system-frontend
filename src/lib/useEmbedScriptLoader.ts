import { useEffect } from "react";

export const useEmbedScriptLoader = (embedToken: string | undefined | null) => {
  useEffect(() => {
    if (!embedToken) return;

    // Remove any stale script instance before mounting a new one
    const existingScript = document.getElementById("viasocket-embed-main-script");
    if (existingScript) existingScript.remove();

    const script = document.createElement("script");
    script.id = "viasocket-embed-main-script";
    script.src = "https://embed.viasocket.com/prod-embedcomponent.js";
    script.setAttribute("embedToken", embedToken);
    // NOTE: Do NOT set parentId — that would make the embed auto-render on page load.
    // The embed should only open when openViasocket() is explicitly called.
    
    document.body.appendChild(script);

    return () => {
      // Clean up script
      const scriptEl = document.getElementById("viasocket-embed-main-script");
      if (scriptEl) scriptEl.remove();
      
      // Clean up embed iframe container if Viasocket injected one
      const container = document.getElementById("iframe-viasocket-embed-parent-container");
      if (container) container.remove();
    };
  }, [embedToken]);
};

// Ensure window.openViasocket exists in typescript
declare global {
  interface Window {
    openViasocket?: (scriptId: string | undefined, options: any) => void;
    handleClose?: () => void;
  }
}
