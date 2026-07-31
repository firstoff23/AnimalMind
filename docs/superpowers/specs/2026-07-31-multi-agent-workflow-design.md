# Brainstorming & Design: Multi-Agent Workflow (AnimalMind)

## 1. Problem Statement
The AnimalMind project relies on a multi-agent architecture (`arquiteto`, `implementador`, `tester`, `revisor`) to divide labor. Currently, the agents have well-defined personas but lack a structured hand-off protocol. Without clear protocols, agents might overlap in duties or fail to locate the artifacts produced by the previous agent in the chain.

## 2. Proposed Approaches

### Approach A: Implicit Handoff (Current)
Agents rely on the user to manually copy-paste plans and instructions between them. 
- *Pros:* Simple.
- *Cons:* Error-prone, scales poorly, loses context.

### Approach B: Standardized Artifact Handoff (Recommended)
Establish a rigid protocol using Markdown artifacts as the source of truth for inter-agent communication.
- `arquiteto` produces `docs/adrs/<id>-<feature>.md` (Architecture) and an `implementation_plan.md` artifact.
- `implementador` consumes the plan, produces code, and creates `task.md` / `walkthrough.md`.
- `tester` consumes `walkthrough.md` to know what was built, writes tests, updates `walkthrough.md`.
- `revisor` reads the initial plan and final codebase, validates against acceptance criteria, and marks the feature complete.

## 3. Design Decision
We proceed with **Approach B**. It standardizes communication without requiring complex external orchestration tools. We will embed these hand-off protocols directly into the `.agent.md` system prompts for each respective agent.

## 4. Updates Required
- **arquiteto.agent.md**: Add instructions to explicitly create an `implementation_plan.md` artifact for the `implementador`.
- **implementador.agent.md**: Add instructions to consume the plan, maintain a `task.md` checklist, and produce a `walkthrough.md` artifact.
- **tester.agent.md**: Add instructions to read `walkthrough.md` to understand the feature context before generating test suites.
- **revisor.agent.md**: Add instructions to audit the codebase against the original `implementation_plan.md`.

## 5. Success Criteria
Each agent clearly understands its inputs (what to read) and its outputs (what to create for the next agent), ensuring a seamless baton pass.
