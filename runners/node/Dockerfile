FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends time && rm -rf /var/lib/apt/lists/*
WORKDIR /box
USER 65534:65534
