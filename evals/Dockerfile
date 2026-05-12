FROM node:22

# System libs for Claude native binary + basic dev tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl ca-certificates \
    libssl3 libstdc++6 libglib2.0-0 libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code + tooling AS ROOT → lands in /usr/local/bin (always in PATH)
RUN npm install -g @anthropic-ai/claude-code typescript tsx

# Now drop to non-root user
USER node
WORKDIR /workspace

# Headless/sandbox flags (critical)
ENV CLAUDE_CODE_SIMPLE=1 \
    TERM=dumb \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

# No ENTRYPOINT — runner uses sh -c
CMD ["sh"]