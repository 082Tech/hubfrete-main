const CHAT_API_URL = "https://n8n.srv1251718.hstgr.cloud/webhook/ia/enviar/mensagem";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function generateSessionId(): string {
  return crypto.randomUUID();
}

export function getOrCreateSessionId(): string {
  const storageKey = "hubfrete-session-id";
  let sessionId = sessionStorage.getItem(storageKey);
  
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(storageKey, sessionId);
  }
  
  return sessionId;
}

export async function sendMessage(
  sessionId: string,
  chatInput: string,
  jwt: string
): Promise<string> {
  const response = await fetch(CHAT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "sendMessage",
      sessionId,
      chatInput,
      jwt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Erro ao enviar mensagem: ${response.status}`);
  }

  // Get response as text first
  const text = await response.text();
  
  // If empty response
  if (!text || text.trim() === "") {
    return "Desculpe, não consegui processar sua mensagem.";
  }
  
  // Try to parse as JSON first (backward compatibility)
  try {
    const data = JSON.parse(text);
    
    // Handle array response format: [{ "output": "..." }]
    if (Array.isArray(data) && data.length > 0 && data[0]?.output) {
      return data[0].output;
    }
    
    // Handle object response format: { "output": "..." }
    if (data && typeof data === 'object' && 'output' in data && data.output) {
      return data.output;
    }
    
    // If parsed but no output field, return original text
    return text;
  } catch {
    // JSON parse failed - try regex extraction for malformed JSON with newlines
    // Match "output": followed by the content until the closing }
    const outputMatch = text.match(/"output"\s*:\s*"([\s\S]*?)"\s*\}$/);
    if (outputMatch && outputMatch[1]) {
      // Unescape common escape sequences
      return outputMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
    
    // Try alternative: extract content between "output":" and the last "}
    const altMatch = text.match(/"output"\s*:\s*"([\s\S]+)$/);
    if (altMatch && altMatch[1]) {
      // Remove trailing "} and clean up
      let content = altMatch[1].replace(/"\s*\}\s*$/, '');
      return content
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
    
    // Not JSON, return as plain text
    return text;
  }
}
