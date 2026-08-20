const directEndpoint = process.argv[2]?.startsWith("http") ? process.argv[2] : null;
const endpoint = directEndpoint ?? process.argv[3] ?? "http://127.0.0.1:4173/api/turbo";
const intervalMs = 10_000;

async function postTurbo() {
  try {
    const response = await fetch(endpoint, { method: "POST" });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${body}`);
    }
    console.log(`[${new Date().toISOString()}] ${body}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ${error.message}`);
  }
}

await postTurbo();
const timer = setInterval(postTurbo, intervalMs);

function stop() {
  clearInterval(timer);
  console.log("Turbo loop stopped.");
}

process.once("SIGINT", stop);
process.once("SIGTERM", stop);