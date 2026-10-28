#!/usr/bin/env bash
# Setup script for the Claude Code cloud environment: installs the global skills/plugins
# before each session starts. Paste into Environment → Edit → Setup script.
# Each step is independent so one failing download does not stop the rest.
set -u
for m in obra/superpowers addyosmani/agent-skills DietrichGebert/ponytail multica-ai/andrej-karpathy-skills; do
  claude plugin marketplace add "$m" --scope user || echo "skip marketplace $m"
done
for p in superpowers@superpowers-dev agent-skills@addy-agent-skills ponytail@ponytail andrej-karpathy-skills@karpathy-skills; do
  claude plugin install "$p" --scope user || echo "skip plugin $p"
done
export PATH="$HOME/.local/bin:$PATH"
uv tool install graphifyy && graphify install || echo "skip graphify"
exit 0
