# c and c++ runner. gnu time reports cpu time and peak rss on stderr after the
# program exits, which works identically on linux hosts and inside colima.
FROM gcc:13-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends time && rm -rf /var/lib/apt/lists/*
WORKDIR /box
USER 65534:65534
