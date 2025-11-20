# Repository Guidelines

TourLICA-AI is being bootstrapped as an agentic travel-planning workspace, so treat every contribution as shaping the initial foundation. Keep changes small, documented, and reproducible so future agents can reason about them quickly.

## Project Structure & Module Organization

Create and maintain the core runtime under `src/`, with subpackages such as `src/agents/` (planner/critic logic), `src/pipelines/` (retrieval, scoring, orchestration), and `src/interfaces/` (API or CLI adapters). Mirror each module inside `tests/` to keep coverage obvious. Use `assets/` for prompt templates, tourism datasets, or mock itineraries; treat `assets/examples/` as read-only fixtures. Place automation helpers in `scripts/` (e.g., `scripts/bootstrap_env.sh`) and configuration in `configs/` (YAML/JSON consumed by agents).

## Build, Test, and Development Commands

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt      # sync core dependencies
pre-commit install                   # enable formatting + lint hooks
make run-local                       # launch the default agent loop
pytest -m fast                       # run unit suites before pushing
pytest --maxfail=1 --disable-warnings -q  # CI-equivalent check
```
Document new targets inside `Makefile` or `justfile` so other agents can reuse them without guessing.

## Coding Style & Naming Conventions

Use Python 3.11 typing everywhere; run `ruff format` and `ruff check` (configured in `pyproject.toml`) before committing. Favor descriptive module names (`tour_query_store.py`) and snake_case for functions/variables, PascalCase for classes, and kebab-case for CLI entry scripts. Limit modules to a single agent responsibility and keep public APIs exported via each package’s `__all__`.

## Testing Guidelines

Pytest is the default harness. Add regression tests under `tests/<module>/test_<feature>.py` and mark longer integrations with `@pytest.mark.slow`. Guard against stochastic outputs by seeding randomness inside fixtures. Aim for >85% coverage on planner and scoring packages; include snapshot fixtures for prompt text to detect accidental wording drift.

## Commit & Pull Request Guidelines

Follow Conventional Commits (e.g., `feat: add hotel ranking agent`). Reference linked issues in the body and describe agent behaviors impacted, expected input/output, and manual test evidence. Pull requests must include: scope summary, demo transcript or CLI sample, updated docs/configs, and confirmation that `pytest` + linters passed locally. Request reviews from at least one agent familiar with the touched module.

## Security & Configuration Tips

Never commit API keys or traveler PII; load secrets through `.env` and reference them via `pydantic` settings models. Keep mock data anonymized. When adding new providers, document required scopes in `configs/<provider>.md` and validate inputs before sending them to third-party APIs.
