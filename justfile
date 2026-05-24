set shell := ["bash", "-euo", "pipefail", "-c"]
venv_python := "./.venv/bin/python"

default:
  @just --list

bootstrap: _ensure-venv
  {{venv_python}} -m pip install -e '.[dev]'
  cd bwcom-next && npm ci

_ensure-venv:
  if [ ! -x .venv/bin/python ]; then \
    if python3 -m venv .venv; then \
      :; \
    elif python3 -m virtualenv .venv; then \
      :; \
    else \
      echo "Unable to create .venv; install Python venv support or virtualenv." >&2; \
      exit 1; \
    fi; \
  fi

lint: _python-lint _next-lint _terraform-lint _shell-lint

test: _python-test _next-test

_python-lint:
  {{venv_python}} -m ruff format --check scripts
  {{venv_python}} -m ruff check scripts
  {{venv_python}} -m mypy scripts/strava_pipeline scripts/strava_to_training_log.py scripts/strava_read_window.py

_python-test:
  {{venv_python}} -m pytest scripts/tests -q

_next-lint:
  cd bwcom-next && npm run format:check && npm run lint

_next-test:
  cd bwcom-next && npm run test

_next-build:
  cd bwcom-next && npm run build

_terraform-lint:
  terraform fmt -check -recursive bwcom-terraform

_shell-lint:
  bash -n scripts/*.sh
