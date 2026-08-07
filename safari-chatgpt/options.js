const api = globalThis.browser ?? globalThis.chrome;
const keyInput = document.getElementById("key");
const status = document.getElementById("status");

async function load() {
  const data = await api.storage.local.get(["openai_api_key"]);
  if (data.openai_api_key) keyInput.value = data.openai_api_key;
}

document.getElementById("save").addEventListener("click", async () => {
  const key = keyInput.value.trim();
  if (!key) return;
  await api.storage.local.set({ openai_api_key: key });
  status.textContent = "Ключ сохранён локально.";
});

document.getElementById("clear").addEventListener("click", async () => {
  await api.storage.local.remove("openai_api_key");
  keyInput.value = "";
  status.textContent = "Ключ удалён.";
});

load();
