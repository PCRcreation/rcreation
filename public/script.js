const body = document.body;
const themeToggle = document.getElementById("themeToggle");
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
const typing = document.getElementById("typing");
const topBtn = document.getElementById("topBtn");
const toast = document.getElementById("toast");

const roles = ["Web Developer", "Python Learner", "Full Stack Learner", "Problem Solver"];
let roleIndex = 0, charIndex = 0, deleting = false;

function typeEffect() {
  const current = roles[roleIndex];
  typing.textContent = deleting ? current.slice(0, charIndex--) : current.slice(0, charIndex++);
  if (!deleting && charIndex > current.length) {
    deleting = true;
    setTimeout(typeEffect, 1200);
    return;
  }
  if (deleting && charIndex < 0) {
    deleting = false;
    roleIndex = (roleIndex + 1) % roles.length;
    charIndex = 0;
  }
  setTimeout(typeEffect, deleting ? 55 : 95);
}
typeEffect();

const savedTheme = localStorage.getItem("portfolio-theme");
if (savedTheme === "light") body.classList.add("light");
updateThemeIcon();

function updateThemeIcon() {
  themeToggle.textContent = body.classList.contains("light") ? "🌙" : "☀️";
}
themeToggle.addEventListener("click", () => {
  body.classList.toggle("light");
  localStorage.setItem("portfolio-theme", body.classList.contains("light") ? "light" : "dark");
  updateThemeIcon();
});

menuToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
document.querySelectorAll(".nav-links a").forEach(link => {
  link.addEventListener("click", () => navLinks.classList.remove("open"));
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add("visible");
  });
}, {threshold: 0.12});
document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

/* ---------- Profile photo fallback (initials if the image is missing) ---------- */
const avatarImg = document.querySelector(".avatar img");
function avatarFallback() {
  avatarImg.style.display = "none";
  avatarImg.parentElement.classList.add("avatar-fallback");
}
if (avatarImg) {
  avatarImg.addEventListener("error", avatarFallback);
  if (avatarImg.complete && avatarImg.naturalWidth === 0) avatarFallback();
}

/* ---------- Projects: loaded from the admin dashboard (database) ----------
   The cards written in index.html are kept as a fallback, used only if the
   server cannot be reached (for example when opening the file directly). */
const projectsGrid = document.getElementById("projectsGrid");
const filterRow = document.getElementById("filterRow");
const projectCount = document.getElementById("projectCount");
let activeFilter = "all";

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;   // textContent = safe, no HTML injection
  return node;
}
function isSafeUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch (e) {
    return false;
  }
}
const labelize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

function applyFilter() {
  document.querySelectorAll("#projectsGrid .project").forEach(card => {
    card.style.display = activeFilter === "all" || card.dataset.category === activeFilter ? "" : "none";
  });
  filterRow.querySelectorAll(".filter").forEach(b => {
    b.classList.toggle("active", b.dataset.filter === activeFilter);
  });
}

function buildFilters(list) {
  const categories = [...new Set(list.map(p => p.category))];
  if (activeFilter !== "all" && !categories.includes(activeFilter)) activeFilter = "all";
  filterRow.replaceChildren();
  const addButton = (value, label) => {
    const b = make("button", "filter", label);
    b.type = "button";
    b.dataset.filter = value;
    filterRow.append(b);
  };
  addButton("all", "All");
  categories.forEach(c => addButton(c, labelize(c)));
  filterRow.style.display = categories.length > 1 ? "" : "none";
}

function renderProjects(list) {
  projectsGrid.replaceChildren();
  list.forEach((p, i) => {
    const card = make("article", "project glass reveal");
    card.dataset.category = p.category;
    card.append(
      make("div", "project-number", String(i + 1).padStart(2, "0")),
      make("div", "project-icon", p.icon || "🚀"),
      make("h3", "", p.title),
      make("p", "", p.description)
    );
    const tags = make("div", "tags");
    (p.tags || []).forEach(t => tags.append(make("span", "", t)));
    card.append(tags);
    if (p.link && isSafeUrl(p.link)) {
      const a = make("a", "project-link", "View project →");
      a.href = p.link;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      card.append(a);
    }
    projectsGrid.append(card);
    observer.observe(card);
  });
  if (!list.length) projectsGrid.append(make("p", "empty-note", "New projects are coming soon."));
  if (projectCount) projectCount.textContent = String(list.length).padStart(2, "0") + (list.length ? "+" : "");
  buildFilters(list);
  applyFilter();
}

filterRow.addEventListener("click", (event) => {
  const button = event.target.closest(".filter");
  if (!button) return;
  activeFilter = button.dataset.filter;
  applyFilter();
});

fetch("/api/projects", {headers: {Accept: "application/json"}})
  .then(res => {
    if (!res.ok) throw new Error("projects unavailable");
    return res.json();
  })
  .then(list => { if (Array.isArray(list)) renderProjects(list); })
  .catch(() => { /* keep the fallback cards from index.html */ });

window.addEventListener("scroll", () => {
  topBtn.classList.toggle("show", window.scrollY > 500);
});
topBtn.addEventListener("click", () => window.scrollTo({top:0, behavior:"smooth"}));

document.getElementById("year").textContent = new Date().getFullYear();

/* ---------- Contact form: saved to the database, shown in the admin dashboard ---------- */
let toastTimer;
function showToast(message, isError) {
  toast.textContent = message;
  toast.classList.toggle("error", Boolean(isError));
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 4500);
}

const contactForm = document.getElementById("contactForm");
contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = contactForm.querySelector("button[type='submit']");
  const originalLabel = button.textContent;
  const payload = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    message: document.getElementById("message").value,
    website: document.getElementById("website").value
  };

  button.disabled = true;
  button.textContent = "Sending…";
  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not send your message. Please try again.");
    contactForm.reset();
    showToast("Thank you! Your message has been sent.");
  } catch (err) {
    const offline = err instanceof TypeError;
    showToast(offline ? "Could not reach the server. Please try again later." : err.message, true);
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
});
