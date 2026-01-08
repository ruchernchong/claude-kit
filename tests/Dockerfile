# Alpine Linux - minimal Docker image (~5MB)
# Perfect for testing bash scripts and installations

FROM alpine:3.19

# Install only essential packages
RUN apk add --no-cache \
    bash \
    git \
    coreutils

# Create a test user (simulates real user environment)
RUN adduser -D -s /bin/bash testuser

# Switch to test user
USER testuser
WORKDIR /home/testuser

# Copy the repository into the container
COPY --chown=testuser:testuser . /home/testuser/claude-kit

# Set working directory to the repository
WORKDIR /home/testuser/claude-kit

# Default command shows help
CMD ["bash", "-c", "echo 'Test environment ready. Run: bash scripts/install-claude.sh' && bash"]
