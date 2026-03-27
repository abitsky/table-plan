# How to Run PlaceCard on Your Computer

This guide walks you through opening PlaceCard in your browser for testing. You'll do this every time you want to work on or test the app.

---

## Step 1: Open Terminal

Terminal is a text-based app that lets you run commands on your computer.

- Press **Command + Space** to open Spotlight Search
- Type **Terminal** and press Enter

---

## Step 2: Navigate to the PlaceCard folder

In Terminal, type this exactly and press Enter:

```
cd /Users/arlen/claude-projects/table-plan
```

---

## Step 3: Start the app

Type this and press Enter:

```
npm run dev
```

You'll see some text appear. Wait until you see a line that says something like:

```
▲ Next.js
- Local: http://localhost:3001
```

That means the app is running.

---

## Step 4: Open it in Chrome

Open Chrome and go to:

```
http://localhost:3001
```

PlaceCard will load just like a normal website.

---

## Stopping the app

When you're done, go back to Terminal and press **Control + C**. That shuts it down.

---

## Troubleshooting

**The page won't load / says "This site can't be reached"**
The app isn't running. Go back to Step 2 and start it again.

**Terminal says "command not found: npm"**
Node.js isn't installed or something is wrong with your setup. Ask Claude to help.

**Port already in use error**
Another copy of the app might already be running. Press Control + C to stop it, then try `npm run dev` again.
