const DEFAULT_ENDPOINT = "http://127.0.0.1:9222";
const SAVE_KEY = "taskbar-idle-rpg-save";
const BACKUP_KEY = "taskbar-idle-rpg-save-backup";

async function listTargets(endpoint) {
  const response = await fetch(`${endpoint}/json/list`);
  if (!response.ok) throw new Error(`DevTools endpoint returned HTTP ${response.status}`);
  return response.json();
}

function pageTarget(targets) {
  return targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl)
    ?? targets.find((target) => target.webSocketDebuggerUrl);
}

function receiveMessage(socket, id) {
  return new Promise((resolve, reject) => {
    const onMessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      socket.removeEventListener("message", onMessage);
      socket.removeEventListener("error", onError);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    };
    const onError = () => {
      socket.removeEventListener("message", onMessage);
      socket.removeEventListener("error", onError);
      reject(new Error("DevTools WebSocket connection failed"));
    };
    socket.addEventListener("message", onMessage);
    socket.addEventListener("error", onError);
  });
}

export async function readLocalStorage(key = SAVE_KEY, endpoint = DEFAULT_ENDPOINT) {
  return evaluateRuntime(`localStorage.getItem(${JSON.stringify(key)})`, endpoint);
}

export async function evaluateRuntime(expression, endpoint = DEFAULT_ENDPOINT, options = {}) {
  const targets = await listTargets(endpoint);
  const target = pageTarget(targets);
  if (!target) throw new Error(`No page target found at ${endpoint}`);

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", () => reject(new Error("Could not connect to TASMON DevTools")), { once: true });
  });

  try {
    socket.send(JSON.stringify({
      id: 1,
      method: "Runtime.evaluate",
      params: { expression, returnByValue: true, awaitPromise: options.awaitPromise === true },
    }));
    const evaluated = await receiveMessage(socket, 1);
    if (evaluated?.exceptionDetails) {
      throw new Error(evaluated.exceptionDetails.exception?.description ?? "Runtime evaluation failed");
    }
    return evaluated?.result?.value ?? null;
  } finally {
    socket.close();
  }
}

export { BACKUP_KEY, DEFAULT_ENDPOINT, SAVE_KEY };
