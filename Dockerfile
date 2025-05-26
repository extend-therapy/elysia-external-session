FROM oven/bun:latest
RUN useradd -ms /bin/sh -u 1001 app
USER app


WORKDIR /app
COPY --chown=app:app bun.lock package.json ./
RUN bun install

COPY --chown=app:app . /app

CMD ["bun", "run", "example/index.ts"]

