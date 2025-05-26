# elysia-redis-session

**version: 0.0.1**

Distributed under MIT license, understand what that means and read the [LICENSE](/LICENSE) file.

A Typescript (Bun-specific!!!) plugin for Elysia.js that makes using sessions on Redis easier. It uses the Bun-native [Bun.RedisClient](https://bun.sh/docs/api/redis) rather than any external dependency so you must be using Bun at least 1.2.9 (when Bun.RedisClient was released).

This is only a typescript package and can be installed by using

`bun add github:extend-therapy/elysia-redis-session`

or 

`bun add git+ssh://github.com/extend-therapy/elysia-redis-session.git`

You can pin a specific released version or commit with something like:

`bun add github:extend-therapy/elysia-redis-session#v0.0.1`

## Examples
Check out the [example](/example) directory to see how to use the store (or extend one yourself).

If you want to just run the example, use the [docker compose yaml](/docker-compose.yml) via `docker compose up` or `podman compose up`. The compose file also starts a redis service and links to it interal to the docker host.

## Simple Usage
Make sure the types passed to your  below matches the name of your interface above. You don't have to use `RedisStore`. You can make your own. [See below](#extending-the-store-and-session). 

```ts
const interface SimpleSession extends BaseSession {
  anyInfo: any
}

export type BasicSessionHandler = SessionHandler<
  SimpleSession,
  RedisStore<SimpleSession>
>;


const config: SessionHandlerConfig<SimpleSession, RedisStore<SimpleSession>> = {
  name: "session_whatnot",
  store: new RedisStore<SimpleSession>({
    cookieName: "sessionexamplev1",
    expireAfter: 60 * 60 * 24 * 30,
    redisClient: redisClient,
  })
}

const app = new Elysia().use(SessionPlugin(config))

```


## Extending the Store and Session

There's are some type constraints on the BaseStore and BaseSession, so make sure you understand them before you extend them. Check how it was done in the example.


## Using your own Encryption/Decryption routines

Instead of using the aes-256-CGM, you can supply in your config an encrypt and decrypt method of your choosing as long as they match the types from Encryption's encrypt and decrypt routines. They can use anything as long as they produce/take strings.


## The methods may throw (and are not caught)

Because how you choose to handle errors varies and how you choose to handle logging. Errors are thrown from the Encryption class with the `EncryptionError` class type (exported) and `SessionPluginError` from most everywhere else.
