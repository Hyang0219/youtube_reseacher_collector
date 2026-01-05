# Rule: Generating an MVP Product Requirements Document (MVP PRD)

## Goal
Guide an AI assistant in creating a **Minimum Viable Product (MVP) Product Requirements Document** in Markdown format.

The MVP PRD must define the **smallest, fastest, and most efficient product** that meaningfully addresses a **core user problem** and enables **learning or validation**. The document must be clear, actionable, and suitable for implementation by a **junior developer**.

The focus is on **problem validation, speed, and simplicity** — not completeness, scalability, or long-term optimization.

---

## Core Principles
- **Problem-first, not solution-first**
- **One primary user, one primary context**
- **Learning efficiency over feature richness**
- **Explicit trade-offs and exclusions**
- **Prefer simpler alternatives if they achieve the same goal**

---

## Process
1. **Receive Initial Prompt**  
   The user provides a short description of an idea, problem, or feature.

2. **Ask Clarifying Questions (Mandatory)**  
   - Ask **3–5 critical questions only**.
   - Questions must clarify:
     - the **core problem**
     - the **primary user & context**
     - the **MVP goal**
     - the **success signal (OKRs)**
     - major **constraints or risks**
   - Focus on *what* and *why*, not *how*.
   - Provide **A/B/C/D options** for each question so the user can reply concisely (e.g., `1A, 2C, 3B`).

3. **Assess MVP Feasibility**  
   Before finalizing the PRD, evaluate whether the proposed MVP is a **reasonable and efficient way** to achieve the MVP goal.  
   If a simpler or faster alternative exists, it must be proposed and justified.

4. **Generate MVP PRD**  
   Use the structure below.  
   If a requirement does not directly support the MVP goal, it must be excluded.

5. **Save PRD**  
   Save the document as `prd-[feature-name]-mvp.md` inside the `/tasks` directory.

---

## Clarifying Questions (Guidelines)
Ask questions only when answers are not reasonably inferable. Prioritize questions that materially affect MVP scope.

Common areas:
- **Core Problem:** What is the single most painful problem to solve first?
- **User & Context:** Who is the primary early adopter and when does the problem occur?
- **MVP Goal:** What outcome must the MVP achieve to be considered successful?
- **Validation Signal:** What metric tells us this MVP is worth continuing?
- **Constraints:** Time, platform, compliance, integrations, or technical limits.

Avoid questions about scale, edge cases, or long-term roadmap.

### Formatting Requirements
- Number all questions (1, 2, 3…)
- Provide options labeled A, B, C, D
- Keep questions short and unambiguous

---

## MVP PRD Structure (Markdown)

### 1. Title
`MVP PRD: [Feature Name]`

---

### 2. Core Problem
A concise, problem-first statement describing:
- Who is experiencing the problem
- What the pain or unmet need is
- Why it matters (impact)
- Why now (if applicable)

Include the current workaround (if any) and why it is insufficient.

---

### 3. Primary User & Context
- **Primary user (early adopter only)**
- **Usage context:** device/platform, environment, workflow moment
- **Key constraints:** time pressure, cognitive load, technical or operational limits
- **Explicit assumptions** if information is missing

Only include secondary users if absolutely necessary.

---

### 4. MVP Goal
A single, outcome-focused statement describing what the MVP must achieve.

Example:  
> “Enable first-time users to complete X within Y minutes without external help.”

This goal is the reference point for all scope decisions.

---

### 5. MVP OKRs
Define **one Objective only**, with **2–3 Key Results**.

- Objectives are qualitative and outcome-driven.
- Key Results must be measurable and time-bound.
- Focus on **validation, adoption, or learning**, not optimization or scale.

Example:
- Objective: Validate demand for feature X
  - KR1: ≥30% of users complete the core action within 24 hours
  - KR2: At least 10 users return within 7 days

---

### 6. MVP Scope
#### In Scope (Must-have)
- Bullet list of the **minimum capabilities** required to achieve the MVP goal

#### Out of Scope (Explicitly Excluded)
- Features or behaviors deliberately excluded to preserve focus
- Includes items that may be valuable later but are not required for MVP success

---

### 7. MVP Feasibility & Alternatives

#### Feasibility Assessment
- Overall feasibility: **High / Medium / Low**
- Key factors considered:
  - Technical complexity
  - Time to implement
  - Dependencies or constraints
  - Risk of blockage or failure

#### Key Risks
- 2–5 risks that could prevent the MVP from achieving its goal

#### Alternative Approaches (If Applicable)
Identify simpler, faster, or cheaper ways to test the same assumption, such as:
- Manual or operational workaround
- Wizard-of-Oz experience
- Fake-door experiment
- No-code or configuration-based solution

For each alternative:
- What it tests
- What it does not test
- Why it may be preferable (or not)

#### Recommendation
- Clear recommendation to:
  - Proceed with the proposed MVP as-is, or
  - Adjust the MVP approach to a more efficient alternative

---

### 8. User Stories (MVP Only)
5–8 user stories maximum.

Format:
> As a [user], I want to [action], so that [benefit].

Each story must directly support the MVP goal.

---

### 9. Functional Requirements (MVP Only)
- Numbered, testable “The system must…” statements
- Each requirement must clearly trace back to:
  - Core Problem
  - MVP Goal
  - MVP OKRs
- Avoid implementation details unless necessary for clarity

---

### 10. Non-Functional Requirements (Only if Critical)
Include only if failure would block MVP success:
- Performance minimums
- Basic security or privacy requirements
- Accessibility baseline
- Reliability constraints

---

### 11. Success Measurement
Describe how MVP success will be evaluated in practice:
- Metrics or events to track
- Tools or instrumentation assumptions
- How OKRs will be reviewed

---

### 12. Open Questions & Assumptions
- Unresolved decisions
- Assumptions that must be validated quickly
- Items requiring stakeholder input

---

## Target Audience
The MVP PRD is written for a **junior developer**.  
Language must be explicit, concrete, and free of unnecessary product or business jargon.

---

## Output
- **Format:** Markdown (`.md`)
- **Location:** `/tasks/`
- **Filename:** `prd-[feature-name]-mvp.md`

---

## Final Instructions (Hard Rules)
1. Do NOT design for scale or future features.
2. Do NOT include post-MVP ideas unless explicitly requested.
3. Every requirement must support the MVP goal or be removed.
4. If the MVP is assessed as low-feasibility or inefficient for learning, clearly explain why and recommend a better approach.