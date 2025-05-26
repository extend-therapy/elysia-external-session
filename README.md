# elysia-redis-session
Distributed under MIT license, understand what that means and read the [LICENSE](/LICENSE) file.

A Typescript (Bun-specific!!!) plugin for Elysia.js that makes using sessions on Redis easier. It uses the Bun-native [Bun.RedisClient](https://bun.sh/docs/api/redis) rather than any external dependency so you must be using Bun at least 1.2.9 (when Bun.RedisClient was released).

This is only a typescript package and can be installed by using
`bun add github:extend-therapy/elysia-redis-session`


## Examples
Check out the [example](/example) directory to see how to use the store (or extend one yourself).

If you want to just run the example, use the [docker compose yaml](/docker-compose.yml) via `docker compose up` or `podman compose up`. The compose file also starts a redis service and links to it interal to the docker host.

## Extending the Store and Session

There's are some type constraints on the BaseStore and BaseSession, so make sure you understand them before you extend them. Check how it was done in the example.