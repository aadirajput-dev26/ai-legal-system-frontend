import { useEffect } from "react";
import { tools } from "./api";

export const useViasocketEvents = (caseId: string, onToolUpdated?: () => void) => {
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Log event data for debugging
      console.log("Received viaSocket postMessage:", event.data);

      // meta can be a JSON string (per official docs) or an object (legacy)
      let metaObj = event.data?.meta || event.data?.metadata;
      if (typeof metaObj === 'string') {
        try { metaObj = JSON.parse(metaObj); } catch { metaObj = null; }
      }
      
      // 1. Verify message matches the current case
      if (metaObj?.caseId && metaObj.caseId !== caseId) return;
      
      const action = event.data?.action; // 'published' | 'updated' | 'deleted'
      const scriptId = event.data?.id;   // The Viasocket script/tool ID
      
      if (!scriptId) return;

      try {
        if (action === "deleted") {
          // Handle deleting the tool from the database using scriptId
          await tools.delete(caseId, scriptId);
          onToolUpdated?.();
        } else if (action === "published" || action === "updated") {
          const toolDetails = {
            script_id: scriptId,
            webhook_url: event.data?.webhookurl,
            title: event.data?.title,
            description: event.data?.description || event.data?.title,
            openai_tool_json: event.data?.openaiToolJson // JSON Schema description of parameters
          };
          
          // Save/Update toolDetails in our database/state
          await tools.createOrUpdate(caseId, toolDetails);
          onToolUpdated?.();
        }
      } catch (err) {
        console.error("Error syncing Viasocket tool:", err);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [caseId, onToolUpdated]);
};
