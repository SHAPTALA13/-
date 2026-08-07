const api = globalThis.browser ?? globalThis.chrome;
const MODEL = "gpt-5";
const chat = document.getElementById("chat");
const form = document.getElementById("form");
const input = document.getElementById("input");
const send = document.getElementById("send");
const settings = document.getElementById("settings");

let messages = [];

function render() {
  chat.innerHTML = "";
  if (!messages.length) {
    chat.innerHTML = '<div class="empty">Привет. Я ChatGPT.<br>Напиши что-нибудь ниже.</div>';
    return;
  }
  for (const m of messages) {
    const row = document.createElement("div");
    row.className = `msg ${m.role}`;
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = m.content;
    row.appendChild(bubble);
    chat.appendChild(row);
  }
  chat.scrollTop = chat.scrollHeight;
}

async function getKey() {
  const data = await api.storage.local.get(["openai_api_key"]);
  return data.openai_api_key || "";
}

async function askOpenAI() {
  const key = await getKey();
  if (!key) {
    throw new Error("Сначала открой настройки и добавь API-ключ.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`
    },
    body: JSON.stringify({
      model: MODEL,
      input: messages.map(m => ({ role: m.role, content: m.content }))
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `OpenAI API error ${response.status}`);
  }
  return data.output_text || data.output?.flatMap(x => x.content || []).map(x => x.text).filter(Boolean).join("\n") || "Пустой ответ.";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text || send.disabled) return;

  messages.push({ role: "user", content: text });
  input.value = "";
  render();
  send.disabled = true;
  const typing = document.createElement("div");
  typing.className = "msg assistant";
  typing.innerHTML = '<div class="bubble typing">Думаю…</div>';
  chat.appendChild(typing);
  chat.scrollTop = chat.scrollHeight;

  try {
    const answer = await askOpenAI();
    typing.remove();
    messages.push({ role: "assistant", content: answer });
    render();
  } catch (error) {
    typing.remove();
    messages.push({ role: "assistant", content: `Ошибка: ${error.message}` });
    render();
  } finally {
    send.disabled = false;
    input.focus();
  }
});

settings.addEventListener("click", () => api.runtime.openOptionsPage());
input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

render();
