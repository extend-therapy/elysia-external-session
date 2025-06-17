# elysia-external-session

Now called Elysia External Session plugin

**version: 0.0.10**

Distributed under MIT license, understand what that means and read the [LICENSE](/LICENSE) file.

A Typescript **_ONLY_**  and **_Bun-specific_** plugin for Elysia.js that makes using sessions on external services easier. Initially it was just for Redis, but now works for SQLite as well. While I wanted to use the Bun-native RedisClient for the Redis part, it does not support clusters yet, so for production use-cases it may be less functional at the moment (i.e. cannot connect to Upstash or various resources that now by default use clusters). Therefore, a dependency of this package currently is `ioredis`.

This is only a typescript package and can be installed by using:

`bun add github:extend-therapy/elysia-external-session`

or 

`bun add git+ssh://github.com/extend-therapy/elysia-external-session.git`

You can pin a specific released version or commit with something like:

`bun add github:extend-therapy/elysia-external-session#v0.0.10`

## Examples
Check out the [example](/example) directory to see how to use the store (or extend one yourself).

If you want to just run the example, use the [docker compose yaml](/docker-compose.yml) via `docker compose up` or `podman compose up`. The compose file also starts a redis service and links to it interal to the docker host.

## Simple Usage
Make sure the types passed to your  below matches the name of your interface above. You don't have to use `RedisStore`. You can make your own or use SqliteStore or BunRedisStore. [See below](#extending-the-store-and-session). 

```ts
const interface SimpleSession {
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


## Extending the Store

There's are some type constraints on the BaseStore, so make sure you understand them before you extend them. Check how it was done in the example.

## Creating a session type/interface

For RedisStore, if you include a Date or function in your session object, then it will not be simply JSON serializable
Instead use timestamps or other simple data types (Objects as values are generally ok as long as they do not contain functions or dates). This is generally the case for most session structures - but if you create your own store that can handle these things, then it's up to you

## Using your own Encryption/Decryption routines

Instead of using the aes-256-CGM, you can supply in your config an encrypt and decrypt method of your choosing as long as they match the types from Encryption's encrypt and decrypt routines. They can use anything as long as they produce/take strings.


## The methods may throw (and are not caught)

Because how you choose to handle errors varies and how you choose to handle logging. Errors are thrown from the Encryption class with the `EncryptionError` class type (exported) and `SessionPluginError` from most everywhere else.


## Using the session handler

Depending on how the package is imported (whether you're using NodeNext or ESNext) you may not see code completion on the SessionHandler. This might be a good first issue if someone wants to figure out how to get a non-compiled TS library to export the types, it would be fantastic.
