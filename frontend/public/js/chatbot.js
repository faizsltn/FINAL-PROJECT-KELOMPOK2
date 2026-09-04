const form = document.getElementById("chatForm");
const messages = document.getElementById("messages");
const courseIdInput = document.getElementById("courseId");
const questionInput = document.getElementById("question");

function addMessage(text, role) {
  const wrapper = document.createElement("div");
  wrapper.className = `flex ${role === "user" ? "justify-end" : "justify-start"}`;

  const bubble = document.createElement("div");
  bubble.className = `max-w-xl rounded-2xl p-4 ${role === "user" ? "bg-indigo-600" : "bg-slate-800"}`;
  bubble.textContent = text;

  wrapper.appendChild(bubble);
  messages.appendChild(wrapper);
  messages.scrollTop = messages.scrollHeight;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const courseId = courseIdInput.value;
  const question = questionInput.value.trim();

  if (!courseId) {
    alert("Pilih kursus terlebih dahulu.");
    return;
  }

  if (!question) return;

  addMessage(question, "user");
  questionInput.value = "";

  const loading = document.createElement("div");
  loading.className = "text-sm text-slate-400";
  loading.textContent = "AI sedang berpikir...";
  messages.appendChild(loading);

  try {
    const response = await fetch("/chatbot/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, question })
    });

    const data = await response.json();
    loading.remove();

    if (!response.ok) throw new Error(data.error || "Gagal mendapatkan jawaban.");

    addMessage(data.answer, "ai");
  } catch (error) {
    loading.remove();
    addMessage(`Error: ${error.message}`, "ai");
  }
});