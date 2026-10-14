# Portfolio + Admin Dashboard

Your existing **portfolio-modern** website, now with a real backend:

- 🔐 **Secure admin login** (hashed password, HttpOnly cookie, lockout after failed attempts)
- 🗂️ **Projects manager** – add, edit, hide/show, delete. Your website updates automatically.
- ✉️ **Contact messages** – the contact form on your site saves to the database; read, search, mark read/unread, reply, delete.
- Built with **Node.js + Express + MongoDB** (no frameworks on the front end – plain HTML/CSS/JS, same look as your site).

---

## 1. What to install (one time)

| Tool | Where | Notes |
|---|---|---|
| **Node.js (LTS)** | https://nodejs.org | Choose the "LTS" button. Restart VS Code afterwards. |
| **VS Code** | https://code.visualstudio.com | You probably have it already. |
| **MongoDB** | pick **one** option below | The database. |

**MongoDB – Option A: Atlas (cloud, free, no installation)** ← easiest

1. Create a free account at https://www.mongodb.com/cloud/atlas and create a free **M0** cluster.
2. **Database Access** → *Add New Database User* → choose a username + password (write them down).
3. **Network Access** → *Add IP Address* → *Allow access from anywhere* (fine for learning; restrict later).
4. **Database** → *Connect* → *Drivers* → copy the connection string. It looks like:
   `mongodb+srv://USER:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
5. Replace `<password>` with your real password and add the database name `portfolio_admin` before the `?`:
   `mongodb+srv://USER:MyPass@cluster0.xxxxx.mongodb.net/portfolio_admin?retryWrites=true&w=majority`
   (If your password has symbols like `@ : / #`, they must be URL-encoded, e.g. `@` → `%40`. Or just pick a simpler password.)

**MongoDB – Option B: Local install**

1. Download **MongoDB Community Server**: https://www.mongodb.com/try/download/community
2. **Windows:** run the installer, keep *"Install MongoDB as a Service"* ticked. It starts automatically.
   **Mac:** `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`
3. You don't need to change anything: the default `MONGODB_URI` already points to your own computer.

---

## 2. Run it in VS Code (step by step)

1. Unzip the download. In VS Code: **File → Open Folder…** → choose the **portfolio-modern** folder.
2. Open a terminal inside VS Code: **Terminal → New Terminal** (shortcut: Ctrl + \` ).
3. Install the project's packages (takes about a minute):
   ```bash
   npm install
   ```
4. Create your settings file (this generates a strong random secret for you):
   ```bash
   npm run setup
   ```
5. Open the new file **`.env`** in VS Code's file list and fill in:
   - `ADMIN_EMAIL` – the email you will log in with
   - `ADMIN_PASSWORD` – your own password, **at least 10 characters**
   - `MONGODB_URI` – only change it if you chose Atlas (paste your connection string)
   
   Save the file (Ctrl + S).
6. Create your admin account + load your 4 portfolio projects into the database:
   ```bash
   npm run seed
   ```
   You should see ✅ messages. (After this you may delete the password from `.env` if you like – it is only needed for this step.)
7. Start the server:
   ```bash
   npm run dev
   ```
   Leave this terminal open. You should see:
   ```
   ✅ Connected to MongoDB
   🚀 Website:         http://localhost:3000
   🔐 Admin dashboard: http://localhost:3000/admin
   ```
8. Open in your browser:
   - Website → **http://localhost:3000**
   - Admin → **http://localhost:3000/admin**

> ⚠️ **Open the site through `http://localhost:3000`, not with Live Server.** The Live Server extension only shows static files, so projects and the contact form need this Node server. You don't need Live Server anymore.

To stop the server press **Ctrl + C** in the terminal. Next time you only need `npm run dev`.

---

## 3. Using the dashboard

| Section | What you can do |
|---|---|
| **Overview** | Totals, unread count, latest messages, quick actions |
| **Projects** | **Add project**, **Edit**, **Hide/Show** (hidden = not on website, but kept), **Delete**. Set title, description, category (creates the filter buttons on your site), emoji icon, tags, link, order. |
| **Messages** | Filter All / Unread / Read, search, open a message (auto-marked read), **Reply by email**, mark unread, delete, mark all as read |
| **Settings** | Change your password |

Test it: send a message through the contact form on your website, then check **Messages** in the dashboard. Add a project, then refresh the website.

---

## 4. Project structure

```
portfolio-modern/
├── server.js            ← starts everything
├── package.json
├── .env                 ← YOUR secrets (created by npm run setup, never share/upload it)
├── .env.example         ← template
├── config/              ← settings + database connection
├── models/              ← database shapes: Admin, Project, Message
├── middleware/          ← login check, rate limits
├── routes/
│   ├── public.js        ← GET projects, POST contact form (used by your website)
│   ├── auth.js          ← login / logout / change password
│   └── admin.js         ← projects + messages management (login required)
├── utils/               ← input validation helpers
├── scripts/             ← setup.js, seed.js
├── admin/               ← the dashboard pages (login.html, dashboard.html, assets/)
└── public/              ← YOUR WEBSITE (index.html, style.css, script.js, images, resume)
```

Only the `public/` folder is visible to visitors – your server code and `.env` are never exposed.

**Editing your website** (name, about text, education, links…) → edit `public/index.html`, then refresh the browser.
**Resume** → put your PDF at `public/resume/resume.pdf`.

### What changed in your original website files
- `public/script.js` – projects are loaded from the database; the contact form posts to the server. (If the server is unreachable, the project cards written in `index.html` are shown as a fallback.)
- `public/index.html` – added ids for the project grid, a hidden spam-trap field in the contact form, removed an inline `onerror` handler (blocked by the security policy – handled in `script.js` now).
- `public/style.css` – a few lines added at the bottom.

---

## 5. Troubleshooting

| Problem | Fix |
|---|---|
| `'npm' is not recognized` | Install Node.js, then close and reopen VS Code. |
| `Could not connect to MongoDB` / `ECONNREFUSED` | **Local:** MongoDB isn't running – start the MongoDB service (Windows: *Services → MongoDB Server → Start*; Mac: `brew services start mongodb-community`). **Atlas:** check username/password, URL-encode symbols, and that *Network Access* allows your IP. |
| `bad auth` / `Authentication failed` | Wrong Atlas username or password in `MONGODB_URI`. |
| `JWT_SECRET is missing or too weak` | Run `npm run setup` (or delete `.env` first, then run it again). |
| `ADMIN_PASSWORD … is empty / at least 10 characters` | Fix it in `.env`, save, run `npm run seed` again. |
| `Port 3000 is already in use` | Close the other program, or set `PORT=4000` in `.env`. |
| **Forgot admin password** | Put a new `ADMIN_EMAIL`/`ADMIN_PASSWORD` in `.env`, run `npm run reset-admin`. |
| Login says "temporarily locked" | 5 wrong passwords → locked for 15 minutes. Wait, or run `npm run reset-admin`. |
| Website still shows old projects | Make sure you opened `http://localhost:3000` (not Live Server) and hard refresh (Ctrl + Shift + R). |
| Can't stay logged in when `NODE_ENV=production` on your own PC | Production cookies need HTTPS. Use `NODE_ENV=development` locally. |

---

## 6. Security features included

- Passwords stored as **bcrypt** hashes (never plain text); generic "invalid email or password" message
- Login in an **HttpOnly, SameSite=Strict** cookie (JavaScript can't read it, other sites can't use it)
- **Brute-force protection:** rate limit on login + account lock after 5 failures
- Extra **CSRF** check header on every change request
- **Helmet** security headers incl. a strict Content-Security-Policy
- All input **validated**; the dashboard shows data as text only (no HTML injection / XSS); project links must be `http(s)://`
- Contact form: rate-limited + hidden spam trap; body size limited to 10 KB
- Dashboard page isn't even sent to people who aren't logged in

## 7. Before putting it online (deploying)

1. Use **MongoDB Atlas** and restrict Network Access to your host if possible.
2. Set environment variables on your host (don't upload `.env`): `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, and `TRUST_PROXY=true` if behind a proxy (Render, Railway, Nginx…).
3. Serve over **HTTPS** (hosts like Render/Railway do this automatically).
4. Run `npm run seed` once with `ADMIN_EMAIL` / `ADMIN_PASSWORD` set, then remove the password variable.
5. Use a long, unique admin password. Never commit `.env` to GitHub (`.gitignore` already excludes it).


## 8. Recommended project data

The starter database now contains exactly these four projects:

1. Personal Portfolio
2. To-Do List
3. Food Delivery
4. Reuse Market

You can edit, hide, show, or delete them from **Admin → Projects**.

## 9. GitHub and live-link setup

### Upload to GitHub

1. Make sure `.env` is not present in the files you commit. The `.gitignore` file already ignores `.env` and `node_modules`.
2. In VS Code open **Source Control** → **Initialize Repository**.
3. Commit the files with a message such as `Initial portfolio website`.
4. Click **Publish Branch** and create a GitHub repository such as `portfolio-modern`.
5. Your repository link will look like:
   `https://github.com/YOUR-USERNAME/portfolio-modern`

### Important: GitHub Pages is not the correct host for this full project

This project needs Node.js/Express and MongoDB. GitHub can store the code, but GitHub Pages cannot run the Express server or connect the secure admin dashboard to MongoDB.

Use a Node.js host such as Render for the live application. Set these environment variables on the host instead of uploading `.env`:

- `NODE_ENV=production`
- `MONGODB_URI=<your MongoDB Atlas connection string>`
- `JWT_SECRET=<the strong secret created by npm run setup>`
- `SESSION_HOURS=2`
- `TRUST_PROXY=true`
- `ADMIN_EMAIL=<your admin email>`
- `ADMIN_PASSWORD=<your admin password>`

After deployment, your live links will be similar to:

- Portfolio: `https://your-app-name.onrender.com`
- Admin: `https://your-app-name.onrender.com/admin`
- GitHub source: `https://github.com/YOUR-USERNAME/portfolio-modern`

## 10. If you already seeded an older database

The seed script only inserts starter projects when the `projects` collection is empty. If your Atlas database already contains the old three projects, the new four projects will not automatically replace them.

The safest beginner method is:

1. Open MongoDB Atlas → your database → `projects` collection.
2. Delete the old project documents.
3. In VS Code run:
   `npm run seed`
4. The four new projects will be inserted.

Do not delete the `admins` collection unless you intentionally want to recreate the admin account.
