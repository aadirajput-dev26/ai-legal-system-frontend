import { useEffect } from "react";

export const useEmbedScriptLoader = () => {
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

// Ensure window.openViasocket exists in typescript
declare global {
  interface Window {
    openViasocket?: (scriptId: string | undefined, options: any) => void;
    handleClose?: () => void;
  }
}
