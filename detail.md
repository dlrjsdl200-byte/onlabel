# **2026 Built with Claude: Life Sciences Participant Guide**

Thank you for being part of the [Built with Claude: Life Sciences](https://cerebralvalley.ai/e/built-with-claude-life-sciences) 👋 This guide is your all-in-one resource for the event, including schedule, rules, technical resources, problem statements, judging information, and more. Please read this carefully; most answers can be found here.

## **1️⃣ Connect with the Community**

### Discord

Join the hackathon Discord server here: <https://anthropic.com/discord>

[linkEmbed]

**Please note:** We will assign a custom role to your Discord handle so you will be able to see the hackathon specific channels. Ping @CV in the #hackathon-access channel if you do not receive the Hackathon Participant role within a few hours.

### Socials

Use the hero image below on X and LinkedIn.

![](https://cdn.cerebralvalley.ai/2026-07-07T01:26:37_693Z-Built_with_Claude_Life_Sciences)## **2️⃣ Hackathon Schedule**

- **Tuesday, July 7th**
  - **12:00 PM (ET):** Virtual Kickoff – rules, prizes, judging, technical talks
  - **12:30 PM (ET):** Hacking officially begins; team formation on Discord
  - **5:00–6:00 PM (ET):** Anthropic office hours (#office-hours)
- **Wednesday, July 8th**
  - **12:00–1:00 PM (ET):** Live Session One - Overview of Claude Science with Alexander Tarashansky, Member of Technical Staff at Anthropic 
  - **5:00–6:00 PM (ET):** Anthropic office hours (#office-hours)
- **Thursday, July 9th**
  - **5:00–6:00 PM (ET):** Anthropic office hours (#office-hours)
- **Friday, July 10th**
  - **12:00 PM–1:00 PM (ET):** Live Session Two - From genome to inference without touching a pipette: virtual genome-wide PPI screening leads to real discoveries with Sukrit Silas, Assistant Investigator at Gladstone Institutes
  - **5:00–6:00 PM (ET):** Anthropic office hours (#office-hours)
- **Saturday, July 11th**
  - **All Day:** Hacking continues
- **Sunday, July 12th**
  - **All Day:** Hacking continues
- **Monday, July 13th**
  - **9:00 PM (ET):** Submissions due via CV platform
- **Tuesday, July 14th**
  - **All Day:** First round judging
- **Wednesday, July 15th**
  - **All Day:** First round judging
- **Thursday, July 16th**
  - 1**2:00 PM (ET):** Final Round Judging
    - Top 6 teams announced (#announcements)
    - Final round judging
  - **1:30 PM (ET):** Closing Ceremony
    - Top 3 revealed, celebration & closing remarks

## **3️⃣ Hackathon Rules**

To keep things fair and aligned with our goals, all teams must follow these rules:

- **Open Source:** Everything submitted for you project must be open sourced. Your project should be published under an approved open-source license.
- **New Work Only:** All projects must be started from scratch during the hackathon with no previous work. **Researchers:** starting from an existing question and public datasets is fine, but the analysis must happen during the event.
- **Team Size:** Teams may have up to 2 members.
- **Banned Projects:** Projects will be disqualified if they: violate legal, ethical, or platform policies, use code, data, or assets you do not have the rights to.

## **4️⃣ Problem Statements & Example Projects**

### ***\[Researcher Track\]*  Build From the Bench**

Using Claude Science, start from a biological question you've been thinking through and find the existing datasets and tools needed to answer it. Submit something discrete — a finding, a trained model, an analysis others can reproduce — and show us how Claude Science got you there. 

*Looking for ideas? These datasets from Gladstone Institutes are optional starting points*:

- Look for new drug targets in the[ CD4+ T cell Perturb-seq data](https://virtualcellmodels.cziscience.com/dataset/genome-scale-tcell-perturb-seq) from **Alex Marson's** lab ([code](https://github.com/emdann/GWT_perturbseq_analysis_2025),[ preprint](https://www.biorxiv.org/content/10.64898/2025.12.23.696273v1)).
- Predict what a noncoding variant does to chromatin in a cell type you care about, the way **Ryan Corces's** lab does it — run their pre-trained brain models from the[ Corces Resources page](https://www.corceslab.com/pages/Resources/), or train your own with[ ChromBPNet](https://github.com/kundajelab/chrombpnet) on any[ ENCODE](https://www.encodeproject.org/) ATAC-seq experiment.
- Find regions of the genome that are deeply conserved across mammals but changed rapidly in humans, using **Katie Pollard's**[ Zoonomia constraint scores](https://genome.ucsc.edu/cgi-bin/hgTrackUi?db=hg38&g=cons241way) and[ Human Accelerated Regions](https://www.biorxiv.org/content/10.1101/2022.10.04.510859v1) — then figure out what they might be doing.

### ***\[Builder Track\]* Build Beyond the Bench**

Using Claude Code, start from a user you can name — a scientist, a lab, a clinic, a biotech — and build the tool they're missing: working software they could use without you in the room, built to outlast the week.

*Looking for ideas? These datasets from Gladstone Institutes are optional starting points*:

- A lab notebook companion for a wet-lab scientist — turns voice memos or rough notes from the bench into structured, searchable experiment records with protocols, reagents, and outcomes auto-tagged.
- A clinical trial matcher for a research coordinator — takes free-text patient notes and surfaces eligible trials from [ClinicalTrials.gov](http://ClinicalTrials.gov), with the inclusion/exclusion reasoning shown for every match.
- A pipeline translator for a bioinformatician's collaborators — wraps an existing command-line analysis pipeline in an interface a bench scientist can run without touching the terminal.

## **5️⃣ Anthropic-Provided Resources**

### **Quickstarts**

- [Claude Science Get Started](https://claude.com/docs/claude-science/get-started)

- [Claude Code Quickstart](https://code.claude.com/docs/en/quickstart)

- [Claude API Quickstart](https://platform.claude.com/docs/en/get-started)

- [Claude Models Overview](https://platform.claude.com/docs/en/about-claude/models/overview)

### **Docs**

- [Claude Science Docs](https://claude.com/docs/claude-science/overview)

- [Claude Code Docs](https://code.claude.com/docs)

- [Claude API Docs](https://platform.claude.com/docs/en/home)

- [MCP Docs](https://modelcontextprotocol.io/docs/getting-started/intro)

- [Agent Skills Docs](https://agentskills.io/home)

### **Blogs**

- [Claude Science announcement](https://www.anthropic.com/news/claude-science-ai-workbench)

- [Claude Code Best Practices](https://code.claude.com/docs/en/best-practices)

- [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)

- [Building Agents with the Claude Agent SDK](https://claude.com/blog/building-agents-with-the-claude-agent-sdk)

- [Building multi-agent systems: when and how to use them](https://claude.com/blog/building-multi-agent-systems-when-and-how-to-use-them)

- [Best practices for prompt engineering](https://claude.com/blog/best-practices-for-prompt-engineering)

- [Effective Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

- [Extending Claude’s capabilities with skills and MCP servers](https://claude.com/blog/extending-claude-capabilities-with-skills-mcp-servers)

- [Skills explained: How Skills compares to prompts, Projects, MCP, and subagents](https://claude.com/blog/skills-explained)

- [Building agents with Skills: Equipping agents for specialized work](https://claude.com/blog/building-agents-with-skills-equipping-agents-for-specialized-work)

- [Claude Code power user customization: How to configure hooks](https://claude.com/blog/how-to-configure-hooks)

### **Courses**

- [Claude Code in Action](https://anthropic.skilljar.com/claude-code-in-action)

- [Agent Skills with Anthropic](https://www.deeplearning.ai/short-courses/agent-skills-with-anthropic/)

- [Claude Code Courses GitHub](https://github.com/anthropics/courses)

### **Other**

- [Claude Quickstarts](https://github.com/anthropics/claude-quickstarts) - A collection of projects designed to help developers quickly get started with building deployable applications using the Claude API 

- [Claude Science Product overview](https://claude.com/product/claude-science)

- [A Complete Guide to Building Skills for Claude (eBook)](https://claude.com/blog/complete-guide-to-building-skills-for-claude)

- [Claude Cookbooks](https://platform.claude.com/cookbook/) and [Cookbooks Github Repo](https://github.com/anthropics/claude-cookbooks)

- [Agent Skills Github Repo](https://github.com/anthropics/skills)

## **6️⃣ Judging**

Judging for the Anthropic Virtual Hackathon happens in **two stages**:

### **Stage 1 - Asynchronous Judging**

- **Date:** Tuesday, July 14 – Wednesday, July 15, 2026

- **How it works:**

  - Judges review your **submitted projects asynchronously** via the judging platform.

  - Each team will have uploaded:

    1. A **short demo video** (3 minute maximum)

    2. Open source project repository, notebook, or research write-up

    3. Written summary (100–200 words)

  - Judges independently evaluate projects using **standardized criteria**.\
    **Judging Criteria:**

    1. **Impact (25%)** — What's the real-world potential here? Who benefits, and how much does it matter? For Builder projects: could this become something people use? For Researcher projects: is this a finding or analysis others can build on? Does it fit your track's problem statement?

    2. **Claude Use (25%)** — How creatively did this team use Claude Code? Did they go beyond a basic application? Did they surface capabilities that surprised even us?

    3. **Depth & Execution (20%) —** Did the team push past their first idea? Is the engineering sound and thoughtfully refined? Does this feel like something that was wrestled with — real craft, not just a quick hack?

    4. **Demo (30%) *—*** Is this a working, compelling demo? Does the project hold up — as software you could use, or findings you trust? Is it genuinely cool to watch?

  - After evaluation, the **team aggregates scores** to determine the **Top 3 projects for each track** for the final round

### **Stage 2 - Final Round Live Judging**

- **Date & Time:** Thursday, July 16, 2026, 12:00 PM ET

- **Format:**

  - During the live session, **pre-recorded demos** from each team will be played (3 minutes per team).

  - Judges will deliberate after all demos to determine the winners and runner-ups for each category.

  - **The two winners, runner-ups, and special prize winners** will be announced during the closing ceremony at **1:30 PM ET.**

## **7️⃣ Submission Instructions**

- Submit your project below: 

  [linkEmbed]

- Required for submission:

  - **3-minute demo video** (YouTube, Loom, or similar)

  - **GitHub repository, notebook, or research write-up**

  - **Written description / summary**

- **Deadline:** July 13, 9:00 PM ET

- Make sure your project **was built entirely** during the hackathon; no pre-existing work is allowed. Researchers: starting from an existing question and public datasets is fine, but the analysis must happen during the event.

## **8️⃣ Prizes**

### **Research Track**

- 1st – $30,000 in usage credits

- 2nd - $10,000 in usage credits

- 3rd - $5,000 in usage credits

### **Builder Track**

- 1st – $30,000 in API credits

- 2nd - $10,000 in API credits

- 3rd - $5,000 in API credits

### **The Gladstone Institutes Award – \[$10k in usage Credits\]**

- This prize recognizes the research project with the most potential to advance the field, and is hand-selected by the Gladstone Institutes team.

**❓If you have any questions, please ping in #questions or reach out to moderators.**




Built with Claude: Life Sciences
Remote
Jul 7 at 12:00 PM – Jul 13 at 9:00 PM (EDT)
Join us for Built with Claude: Life Sciences, a global virtual hackathon in partnership with Gladstone Institutes, a biomedical research organization in San Francisco focused on bold science and innovation. 

Claude Science is an AI workbench that brings literature, data, code, and compute into a single research environment, and we want researchers, clinicians, bioinformaticians, and biotech builders to explore what’s newly possible. Whether you’re advancing research or building the next life sciences platform, show us what you can build in one week with Claude Science and Claude Code.

This hackathon has two tracks. The Research track asks you to build from the bench: start from a biological question you've been thinking through and use Claude Science to answer it with something discrete – a finding, a trained model, an analysis others can reproduce. The Build track asks you to build beyond the bench: start from a user in the life sciences you can name – a scientist, a clinic, a biotech – and use Claude Code to create the tool they're missing, working software that outlasts the week.

For the Research track, we’ve partnered with various labs across Gladstone to highlight unique datasets for participants to investigate with Claude Science:

Find new drug targets in this T cell Perturb-seq dataset from the labs of Alex Marson and his collaborator at Stanford University, Jonathan Pritchard.

Train a model that reads DNA to predict regulatory activity, then ask what a single-base change does to it, like how Katie Pollard's lab uses massively parallel reporter assays.

Use one of Nevan Krogan's protein interaction networks to uncover new biology, identify which complex or pathway is doing the work, or predict a missing component.

We’ll select 500 participants across the two tracks and give each one a month of Claude Max 20x and $200 in API credits to build for one week. Compete to win $100k in Claude API and Usage credits.

Judges include representatives from Anthropic and our partner, Gladstone Institutes.

Note: This event is fully virtual. Space is limited to 500 participants. Maximum team size is 2. All participants must submit an application for approval.

Text Blasts
Joshua Brown
Joshua Brown
20h
Hey there! Super excited to hack this upcoming week. A few action items:

Please view all event details, including problem statements, and schedule at https://cerebralvalley.ai/e/built-with-claude-life-sciences/details

Join the Claude Developer Discord (you will be assigned a custom role) for the latest updates: https://anthropic.com/discord

Kickoff is at 12 PM ET on Tuesday, July 7 — see you there!

Claude Max 20x access and API credits have been sent to your email.