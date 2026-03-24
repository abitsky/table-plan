# PlaceCard

## A web app that helps event hosts plan and organize tables for maximum connection and fun

Team: Solo
Contributors: Arlen
Resources: N/A
Status: Draft
Last Updated: 2026-03-24

---

# Problem Alignment

| Planning a wedding seating chart should be simple. You know your guests. You know who gets along, who needs a buffer, and which six people will turn any table into the best one in the room. But translating all of that into an actual chart is surprisingly painful. Existing tools are clunky, buried inside bloated wedding platforms, or not much better than a spreadsheet. So hosts end up doing the most socially consequential decision of the event on a tiny phone screen or a piece of paper with cutouts. The result is a chart that gets you to good enough, not one that sets every table up for a great night. This problem extends well beyond weddings. Rehearsal dinners, 50th birthday parties, alumni reunions, corporate galas, Shabbat dinners: any event where someone cares enough to assign a seat deserves a tool that is actually a joy to use. Tens of millions of these events happen in the US every year. No focused, modern, easy product exists to help hosts get it right. |
| :---- |

## High Level Approach

| A web app where hosts input a guest list, set up tables, and drag guests into seats. Hosts can start by grouping guests first and then assigning groups to tables, or go directly to placement. |
| :---- |

## Narrative

| Mickey is planning a wedding. He knows his friends but not his fiancee's friends so well. There are more folks from his side. He wonders how to integrate people without creating tables where people don't talk to one another. Then he wonders where the heck to place the racist uncle. This is getting to be a whole thing. |
| :---- |

## Goals

1. 100 paying customers in the first month
2. Validated that the product works for at least 3 distinct event types within the first 90 days
3. $15,000 in revenue in year 1
4. 90% of first-time users successfully add guests and assign them to a table without hitting a dead end

## Non-goals

1. No AI-powered seating suggestions
2. Not a full wedding planning platform
3. No attendee-facing social features (the Partiful angle is a later version)
4. Not optimized for mobile (desktop-first)
5. No integrations with wedding platforms like Zola or The Knot
6. No seating rules engine or auto-assign in v1

| 🛑 Do not continue if all contributors are not aligned on the problem. 🟢 Complete the following table with "signatures" from all reviewers to move on. |
| :---- |

| REVIEWER | TEAM/ROLE | STATUS |
| :---- | :---- | :---- |
| Arlen | Solo / Product | Approved |

---

# Solution Alignment

## Key Features

**Plan of record**

1. Create an event (name, date, event type)
2. Event can be a project with multiple events (e.g. rehearsal dinner and reception)
3. Add and manage a guest list with basic characteristics: side, relationship type, and a "needs consideration" flag
4. Allow couples to be linked so they are automatically kept together
5. Set up tables (number, shape, size)
6. Drag and drop guests to tables
7. Group guests before assigning to tables
8. Live guest count vs. seat count tracker (e.g. "142 guests, 140 assigned, 2 unassigned")
9. Dashboard to view your projects or projects you have been invited to
10. Share chart with up to 3 collaborators, account required
11. Export the finished chart as a PDF
12. Import guest list via CSV upload

**Future considerations**

1. Attendee-facing social layer (the Partiful angle)
2. AI-powered seating suggestions
3. Seating rules and conflict flagging
4. Mobile optimization

## Key Flows

| Mickey creates a new project for his wedding. He creates two events: rehearsal dinner and reception. He starts with the rehearsal dinner. He uploads his guest list via CSV and the system auto-matches couples and plus ones. He enters the number of tables and sees a visual room layout. He starts grouping guests, with couples automatically grouped together. He flags the racist uncle and leaves him in the unassigned holding area for now. He does not finish and instead grabs a shareable link and sends it to his fiancee. She opens the link, creates a free account, and jumps directly into the chart to continue the work. |
| :---- |

## Key Logic

1. Couples linked together are always assigned to the same table
2. A guest marked "plus one" or "guest" is automatically paired with their host
3. A project can have multiple events and shares a guest pool by default, but each event can have its own subset
4. Collaborator access requires a free account but does not require payment
5. Payment is only triggered when a user creates their own new event
6. An unassigned guest holding area persists until every guest is seated
7. Tables cannot be overfilled beyond their set capacity
8. User selects an event type at creation, which determines available side labels and role tags. V1 supports Wedding, Dinner Party, and Charity/Gala
9. Guests can be assigned a role tag that is customizable by event type, and role tags are visually distinct in the seating chart view
10. CSV importer recognizes common wedding platform export formats (starting with Zola) and auto-links partners and children as grouped units on import

| 🛑 Do not continue if all contributors are not aligned on the solution. 🟢 Complete the following table with "signatures" from all reviewers to move on. |
| :---- |

| REVIEWER | TEAM/ROLE | STATUS |
| :---- | :---- | :---- |
| Arlen | Solo / Product | Approved |

---

# Launch Plan

## Key Milestones

| TARGET DATE | MILESTONE | DESCRIPTION | EXIT CRITERIA |
| :---- | :---- | :---- | :---- |
| March 26, 2026 | Prototype | Working drag and drop, guest list, table setup | Successfully seat all 62 guests for your own wedding without hitting a dead end |
| March 31, 2026 | Auth + Shareable Link | Account creation, collaborator access, shareable view link | Fiancee can open a shared link, create an account, and edit the chart |
| April 30, 2026 | First Paid Outside User | Product priced and distributed to real strangers | One non-family member pays for and completes a seating chart |

## Operational Checklist

| TEAM | PROMPT | Y/N | ACTION (if yes) |
| :---- | :---- | :---- | :---- |
| Analytics | Do you need additional tracking? | Y | Track chart completion rate to measure goal #4 |
| Sales | Do you need sales enablement materials? | N | N/A |
| Marketing | Does this impact shared KPI? | N | N/A |
| Customer Success | Do you need to update support content or training? | N | N/A |
| Product Marketing | Do you need a GTM plan? | Y | Identify wedding Reddit/Facebook communities for launch distribution |
| Partners | Will this impact any external partners? | N | N/A |
| Globalization | Are you launching in multiple countries? | N | N/A |
| Risk | Does this expose a risk vector? | Y | Payment handling and guest data storage need review before launch |
| Legal | Are there potential legal ramifications? | Y | Review data privacy obligations around storing imported guest emails and personal info |

---

# Appendix

## Changelog

| DATE | DESCRIPTION |
| :---- | :---- |
| 2026-03-24 | PRD created |

## Open Questions

1. What is the pricing model exactly? One-time fee per event, subscription, or freemium?
2. Which markets or event types get prioritized for distribution first?
3. How do we find and convert the first 100 paying customers?
4. What does the "needs consideration" flag actually look like in the UI so it's useful without being offensive?
5. How do we handle the Zola import when "Relationship to Couple" is blank or marked "Unknown"?

## FAQs

**Q: Zola already has a seating tool. Why would anyone use this instead?**
A: Zola's tool is mobile-only, clunky, and buried inside a full wedding planning platform. PlaceCard is a focused, desktop-first product built specifically around the seating experience. It's faster to start, easier to use, and not locked to couples who chose Zola for their wedding website.

**Q: Why won't a big player just copy this?**
A: They might, eventually. But large platforms move slowly and optimize for their core product. By the time they build something good, PlaceCard will have a brand, a user base, and features they haven't thought of yet. Being focused is the advantage.

**Q: Why would anyone pay for this when they can use a spreadsheet?**
A: The same reason people pay for Canva instead of building everything in PowerPoint. A spreadsheet can technically do it but it's not designed for it. PlaceCard makes the experience fast, visual, and actually enjoyable.

**Q: Is this only for weddings?**
A: No. V1 is designed for weddings, dinner parties, and charity galas. Any sit-down event with assigned seating is a valid use case.

**Q: What happens to guest data after the event?**
A: An open question we need to resolve before launch, particularly around email addresses and personal information imported via CSV.

## Impact Checklist

- Permissions: No
- Reporting: No
- Pricing: Yes
- API: No
- Global: No
