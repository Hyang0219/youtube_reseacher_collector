# Rule: Generating and Executing an MVP Task List from an MVP PRD (AI Executor)

## Goal
Guide an AI assistant in generating **and executing** an MVP task list derived strictly from an **MVP Product Requirements Document (MVP PRD)**.

Tasks must be written so that **an AI can execute them autonomously**, without relying on human intuition, unstated assumptions, or informal judgement. The task list must represent **only the work required to implement the MVP**, optimized for speed, simplicity, and learning efficiency.

---

## Core Principles
- **MVP-only execution:** If a task does not support the MVP goal, it must not exist.
- **Deterministic execution:** Tasks must be unambiguous and objectively verifiable.
- **No over-engineering:** Prefer the simplest viable implementation.
- **Explicit scope control:** Out-of-scope work is explicitly excluded.
- **Self-correction:** The AI must validate task quality and executability before output.

---

## Output
- **Format:** Markdown (`.md`)
- **Location:** `/tasks/`
- **Filename:** `tasks-[feature-name]-mvp.md`

---

## AI Execution Assumptions
- Tasks will be executed by an AI agent, not a human developer.
- All tasks must be:
  - self-contained
  - deterministic
  - executable with the information provided
- If a task requires missing information, the AI must:
  - add a prerequisite task, or
  - flag the task as blocked with a clear reason and halt execution.

---

## External API Configuration

### API Specification
- The system integrates with an external backend API defined by an OpenAPI specification.
- **OpenAPI specification URL:**  
  https://space.ai-builders.com/backend/openapi.json

### Authentication
- The API requires an API key for authentication.
- The API key must **not** be hard-coded into source files, tasks, or outputs.

### API Key Access
- The API key will be provided to the AI at execution time via an environment variable: **SPACE_API_KEY**

- When making API requests, the AI must:
- read the API key from the environment variable
- attach it according to the authentication mechanism defined in the OpenAPI specification

### OpenAPI Usage Rules (Hard Requirements)
- The AI must inspect the OpenAPI specification **before implementing any API-related task**.
- Endpoints, request bodies, parameters, response schemas, and authentication behavior must be derived **exclusively** from the OpenAPI document.
- The AI must **not guess or invent** endpoints, fields, or request formats.
- If there is a conflict between task instructions and the OpenAPI specification, **the OpenAPI specification takes precedence**.
- If the OpenAPI specification cannot be fetched or parsed, execution must halt and the issue must be reported.

---

## Process

1. **Receive Input**
 - The user provides an MVP PRD or references an existing MVP PRD.

2. **Analyze MVP PRD**
 - Identify:
   - Core Problem
   - MVP Goal
   - MVP Scope (In Scope / Out of Scope)
   - MVP Functional Requirements
   - Feasibility recommendation
   - Key risks and constraints
 - Explicitly ignore:
   - Post-MVP ideas
   - Rejected alternative approaches
   - Scalability, optimization, or future-proofing concerns unless required for MVP success

3. **Phase 1: Generate Parent Tasks**
 - Create the task file.
 - **Always include task `0.0 Create feature branch` as the first task**, unless explicitly instructed otherwise.
 - Generate **4–6 parent tasks** that fully cover MVP implementation.
 - Parent tasks must:
   - Reflect the recommended MVP approach from the feasibility assessment
   - Avoid unnecessary abstraction, infrastructure, or refactoring
 - Output **only parent tasks** (no sub-tasks yet).
 - Inform the user:
   > “High-level MVP tasks generated. Respond with ‘Go’ to generate sub-tasks.”

4. **Wait for Confirmation**
 - Pause execution until the user responds with **“Go”**.

5. **Phase 2: Generate Sub-Tasks**
 - Decompose each parent task into atomic sub-tasks.
 - Each sub-task must:
   - Perform exactly one discrete operation
   - Modify no more than one primary file OR perform one clear action
   - Be independently executable and verifiable
 - Sub-tasks must map directly to MVP functional requirements.

6. **Task Complexity & Quality Check (Mandatory)**
 - Review all tasks before finalizing.
 - Apply the rules defined in **Task Quality & Complexity Rules**.
 - If any task violates these rules, revise it before output.

7. **Task Executability Check (Mandatory)**
 Before final output, the AI must verify:
 1. Every sub-task can be executed with the information provided.
 2. All prerequisites are explicitly listed.
 3. No task relies on human intuition or subjective judgement.
 4. Tasks are ordered to avoid circular dependencies or deadlocks.

 If any check fails, the AI must revise the task list before outputting it.

8. **Consult AI Coach (Optional)**
 - If the `ai-builders-coach` tool is available:
   - Call the coach to review the generated task list for completeness and clarity.
   - Incorporate any critical feedback into the final task list.

9. **Identify Relevant Files**
 - List files likely to be:
   - created
   - modified
   - tested
 - Include test files where applicable.

10. **Generate Final Output**
 - Combine:
   - Relevant Files
   - Notes
   - Tasks (parent + sub-tasks)
 - Ensure checklist formatting consistency.

11. **Save Task List**
  - Save to `/tasks/` as `tasks-[feature-name]-mvp.md`.

---

## Task Quality & Complexity Rules

### Complexity Rules (AI-Enforced)
A sub-task must:
- Take a single, clearly defined action
- Modify at most one primary file OR perform one operational step
- Be split if it involves:
- multiple files
- branching logic
- design decisions

### Quality Rules (AI-Enforced)
Each sub-task must include:
- A clear action verb (e.g., Create, Add, Update, Remove)
- An explicit expected outcome
- Objective completion criteria

### Anti-Patterns (Forbidden)
- “Implement feature X”
- “Handle edge cases”
- “Optimize performance”
- “Refactor for future use”
- Any task not explicitly required for MVP success

---

## Scope Guardrails (Hard Rules)

Do NOT generate tasks for:
- Out-of-scope or post-MVP features
- Alternative MVP approaches rejected in the PRD
- Scalability, optimization, or future-proofing work
- Tooling or infrastructure unless strictly required

If a task feels useful but non-essential, it must be excluded.

---

## Output Format

```markdown
## Relevant Files

- `path/to/file1.ts` – Purpose of file
- `path/to/file1.test.ts` – Tests for `file1.ts`
- `path/to/file2.tsx` – MVP UI component
- `path/to/file2.test.tsx` – Tests for `file2.tsx`

### Notes
- Place test files alongside code when possible.
- Use the project’s standard test runner.

## Instructions for Executing Tasks
- Execute tasks in order.
- After completing each sub-task:
- mark it as completed (`- [x]`)
- verify outputs match completion criteria
- If execution fails or is blocked:
- halt further execution
- clearly report the blocking issue

## Tasks

- [ ] 0.0 Create feature branch
- [ ] 0.1 Create and checkout a new branch (`feature/[feature-name]`)

- [ ] 1.0 Parent Task Title
- [ ] 1.1 Atomic, verifiable sub-task
- [ ] 1.2 Atomic, verifiable sub-task

Final Instructions (Hard Rules)
1. Tasks must reflect only the MVP.
2. Every task must map to an MVP requirement or user story.
3. If a task is complex, split it.
4. If a task does not support the MVP goal, remove it.
5. Do not assume missing context.
6. Do not invent requirements.
7. If uncertainty exists, halt and surface it explicitly.