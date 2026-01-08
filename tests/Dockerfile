# Node.js Alpine - minimal Docker image with Node.js
# Used for testing TypeScript CLI tools

FROM node:22-alpine

# Install essential packages
RUN apk add --no-cache \
    bash \
    git \
    coreutils

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create a test user (simulates real user environment)
RUN adduser -D -s /bin/bash testuser

# Switch to test user
USER testuser
WORKDIR /home/testuser

# Copy the repository into the container
COPY --chown=testuser:testuser . /home/testuser/claude-kit

# Set working directory to the repository
WORKDIR /home/testuser/claude-kit

# Install dependencies
RUN pnpm install --frozen-lockfile

# Default command shows help
CMD ["bash", "-c", "echo 'Test environment ready. Run: pnpm install-commands --ci' && bash"]
