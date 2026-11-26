import assert from "node:assert/strict";
import { test } from "node:test";
import { createPortfolioServer } from "./server.js";

async function startServer(options = {}) {
  const server = createPortfolioServer(options);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return {
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
    url: `http://127.0.0.1:${server.address().port}`,
  };
}

test("serves the portfolio while keeping server files private", async (t) => {
  const app = await startServer();
  t.after(app.close);

  const page = await fetch(app.url);
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type"), /text\/html/);
  const html = await page.text();
  assert.match(html, /Featured book/);
  assert.match(html, /<link rel="stylesheet" href="assets\/styles\.css">/);
  assert.match(html, /<script src="assets\/script\.js"><\/script>/);

  const styles = await fetch(`${app.url}/assets/styles.css`);
  assert.equal(styles.status, 200);
  assert.match(styles.headers.get("content-type"), /text\/css/);
  assert.equal(styles.headers.get("cache-control"), "no-cache");
  assert.match(await styles.text(), /\.armored-flight/);

  const script = await fetch(`${app.url}/assets/script.js`);
  assert.equal(script.status, 200);
  assert.match(script.headers.get("content-type"), /javascript/);
  assert.equal(script.headers.get("cache-control"), "no-cache");
  assert.match(await script.text(), /Gemini portfolio assistant/);

  for (const route of ["/server.js", "/package.json", "/.env"]) {
    const response = await fetch(`${app.url}${route}`);
    assert.equal(response.status, 404);
  }
});

test("reports missing Gemini configuration without exposing credentials", async (t) => {
  const app = await startServer({ apiKey: "" });
  t.after(app.close);

  const response = await fetch(`${app.url}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "What skills does Roshan have?" }),
  });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /GEMINI_API_KEY/);
});

test("forwards validated chat history to Gemini using a server-only API key", async (t) => {
  let upstreamRequest;
  const app = await startServer({
    apiKey: "test-secret",
    fetchImpl: async (url, options) => {
      upstreamRequest = { url, options };
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: "Roshan works with TypeScript." }] } }],
      }), { status: 200 });
    },
  });
  t.after(app.close);

  const response = await fetch(`${app.url}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "What technologies does he use?",
      history: [{ role: "user", text: "Tell me about the portfolio." }],
    }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { answer: "Roshan works with TypeScript." });
  assert.equal(upstreamRequest.options.headers["x-goog-api-key"], "test-secret");
  assert.match(upstreamRequest.url, /models\/gemini-3\.5-flash-lite:generateContent$/);
  assert.equal(JSON.stringify(upstreamRequest.options.body).includes("test-secret"), false);
  const requestBody = JSON.parse(upstreamRequest.options.body);
  assert.equal(requestBody.contents.length, 2);
  assert.ok(requestBody.systemInstruction.parts[0].text.includes("portfolio assistant"));
});

test("rejects malformed chat input before calling Gemini", async (t) => {
  let called = false;
  const app = await startServer({
    apiKey: "test-secret",
    fetchImpl: async () => {
      called = true;
      return new Response("{}");
    },
  });
  t.after(app.close);

  const response = await fetch(`${app.url}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: " ", history: [] }),
  });

  assert.equal(response.status, 400);
  assert.equal(called, false);
});

test("limits the number of Gemini requests from one client", async (t) => {
  const app = await startServer({
    apiKey: "test-secret",
    rateLimit: 1,
    fetchImpl: async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: "Portfolio answer." }] } }],
    }), { status: 200 }),
  });
  t.after(app.close);

  const sendQuestion = () => fetch(`${app.url}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "What does Roshan do?" }),
  });

  assert.equal((await sendQuestion()).status, 200);
  assert.equal((await sendQuestion()).status, 429);
});
