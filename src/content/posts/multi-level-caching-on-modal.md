---
title: Claiming, not caching — singleflight on Modal
date: 2026-05-20
summary: Three cache layers in front of an entity-resolution database — in-process LRU, Modal Dict, and the database itself. A distributed lock plus Queue-coordinated notify collapses 50 concurrent containers into one database round-trip per key. With code, animated diagrams, and an interactive simulator.
tags: [modal, caching, system-design, python]
github: https://github.com/kayvane1/blog
---

**TL;DR**: A document ingestion service has to resolve "Apple Inc." to a stable internal ID — exactly one ID, forever, regardless of how many containers, threads, or weeks have passed. Three cache layers shrink the latency cost from "every lookup is a database round-trip" down to "the popular ones never leave the Python process." L1 (in-process LRU) collapses the 16 threads on one container into one shared answer. L2 (Modal Dict + Queue) collapses the 50 containers into one database call. L3 is the database itself — the source of truth, but tens of milliseconds away over the network. The pattern has a name: _singleflight with a distributed lock and a notify channel_.

---

## The shape of the problem

When N concurrent callers all miss the same cache key, the dumb thing is to let all N pay the compute cost. The clever thing is to elect one to do the work and have the rest wait for the answer. In the Go world this is called **singleflight**. In the cache-papers literature it's **cache stampede prevention** or **dog-piling**. Cross-container, you need a **distributed lock** (some atomic check-and-set) plus a **notify channel** (so waiters block instead of polling). The rest of the post is how to build that on Modal, layer by layer.

<div data-interactive="architecture-diagram"></div>

Misses cascade downward. Hits propagate back up. The lock + Queue lives at L2, which is where the cross-container coordination story actually happens. The three layers exist because the latency cost of each step gets roughly an order of magnitude worse:

| Layer | Typical latency | What it is                           |
| ----- | --------------- | ------------------------------------ |
| L1    | 100 ns – 1 µs   | Python process memory                |
| L2    | 1 – 10 ms       | Modal Dict (intra-Modal network)     |
| L3    | 10 – 100 ms     | Database (network hop outside Modal) |

Each step you avoid is worth ~10× less time. The lock matters because under a stampede, you're not just saving compute — you're collapsing N expensive L3 round-trips into one.

## L1: the in-container layer

A single Modal container, `@app.cls(...)` decorated with `modal.concurrent(max_inputs=16)`. One Python process, up to 16 records in parallel, each referencing 5–20 companies by name. Apple Inc. shows up in roughly 1 in 10 records.

Without L1, every reference to Apple Inc. crosses the network to the Modal Dict. Inside a busy container that's a thousand round-trips for the same key during the container's lifetime — milliseconds per call, all of them avoidable.

A bounded `OrderedDict` inside the Modal class collapses those thousand round-trips into one:

```python
from collections import OrderedDict

class LruCache:
    def __init__(self, max_size: int = 1024):
        self.max_size = max_size
        self.store: OrderedDict[str, Any] = OrderedDict()

    def get(self, key: str):
        if key not in self.store:
            return None
        self.store.move_to_end(key)
        return self.store[key]

    def put(self, key: str, value):
        self.store[key] = value
        self.store.move_to_end(key)
        if len(self.store) > self.max_size:
            self.store.popitem(last=False)
```

Two things to get right at this layer:

- **Key normalisation.** "Apple Inc.", "Apple Inc", "APPLE INC.", "apple inc" all have to produce the same key — otherwise each variant misses L1 (and L2) independently and you've gained nothing. The same normalisation has to apply across containers too, or the L2 hits split.
- **Bounded size.** The LRU eviction matters because the long tail of unique companies will fill the cache otherwise. Tune `max_size` to your hot set.

For traffic patterns where the same hot keys recur within a container's lifetime, L1 alone is the whole answer. L2 and L3 only earn their keep once the same key needs to be hot _across_ containers and _across_ restarts.

## L2: the cross-container layer

Different problem, same shape. Two Modal containers, two ingestion jobs, both look up "Apple Inc.", both miss the local cache, both miss the Dict, both compute, both write a brand-new internal ID. Two IDs for the same real-world entity, downstream joins silently break, on-call is hunting for which one is canonical.

What we want: exactly one container mints and claims the ID. The other one blocks until the first finishes, then reads the same ID and continues. Minting must be a singleton across the entire fleet — _claiming_, not just caching.

This is two primitives stacked:

- The **claim** is `Dict.put(lock_key, ..., skip_if_exists=True)`. Modal's Dict makes the check-and-set atomic; whoever's put returns `True` is the holder, everyone else takes the waiter path.
- The **notify** is a Modal Queue partition per waiter. The holder, when done, puts a tiny message on each waiter's partition. Waiters call `queue.get(partition=…)` and block until that message arrives. No polling.

The Queue isn't optional. Without it, the only way for a waiter to know the holder is done is to keep polling the Dict — a network call per waiter per tick, and in the worst case 50 containers all hammering on the same Apple Inc. key. The full scenario, step by step:

<div data-interactive="coordination-diagram"></div>

The flow lifted out of [`ClaimingCache`](#the-repo):

```python
async def get_or_claim(self, key, compute_fn):
    result_key = f"result:{key}"
    lock_key = f"lock:{key}"

    # Fast path — L2 hit.
    raw = await self.d.get.aio(result_key)
    if self._is_valid_result(raw):
        return raw["value"]

    # Try to acquire the lock atomically.
    token = uuid.uuid4().hex
    lock_val = {"token": token, "ts": time.time(), "waiters": []}
    acquired = await self.d.put.aio(lock_key, lock_val, skip_if_exists=True)

    if acquired:
        try:
            value = await compute_fn()
            await self.d.put.aio(result_key, {"value": value, "schema": 1})

            # Notify everyone who registered while we were computing.
            cur = await self.d.get.aio(lock_key)
            for waiter_id in (cur or {}).get("waiters", []):
                await self.queue.put.aio(
                    {"k": key},
                    partition=waiter_id,
                    partition_ttl=self.partition_ttl,
                )
            return value
        finally:
            await self.d.pop.aio(lock_key)

    # Waiter path — register, then block on the queue.
    waiter_id = uuid.uuid4().hex
    await self._register_waiter(lock_key, waiter_id)
    await self.queue.get.aio(partition=waiter_id, timeout=self.poll_timeout)
    return (await self.d.get.aio(result_key))["value"]
```

Three details that matter more than they look:

1. **`skip_if_exists=True` is the entire lock.** Modal's `Dict.put` makes the check-and-set atomic; without that you have a race where two containers both think they own the key. For entity resolution specifically, this is what stops two containers from both deciding "this is a new entity, mint an ID".
2. **Waiters are registered in a list inside the lock entry.** Registration is itself a CAS loop with retries (see the `_register_waiter` Tenacity block in the full source) — you read the lock entry, append your waiter id, write it back, and re-read to confirm your write wasn't clobbered.
3. **The token field guards against a stale holder.** If the holder dies mid-compute and the lock entry is cleaned up and a new holder takes over, the old holder must not finalise the result. Token mismatch in the finally block is the safety net.

L1 + L2 alone covers everything _if_ your hot keys are accessed often enough to never fall out of [Modal Dict's 7-day inactivity window](https://modal.com/docs/reference/modal.Dict). If they aren't, you need L3.

## L3: the database, behind the network

L3 isn't a sidecar — it's the system of record. The entity table lives in Postgres (or DynamoDB, or whatever you trust to enforce a `UNIQUE` constraint and survive a tenant going quiet for a quarter). Every "compute" in the cache flow is an idempotent database upsert:

```python
async def _resolve_in_db(name: str) -> str:
    row = await db.fetchrow(
        """
        INSERT INTO entities (canonical_name)
        VALUES ($1)
        ON CONFLICT (canonical_name) DO UPDATE
            SET canonical_name = EXCLUDED.canonical_name
        RETURNING id
        """,
        name,
    )
    return row["id"]
```

The `UNIQUE` constraint on `canonical_name` is what makes this safe _even when the cache lock fails_ — under the worst-case race the database still resolves to a single ID. The L2 lock isn't there for correctness; it's there to make sure the database sees one round-trip per key instead of fifty.

A tenant goes quiet for two weeks. Modal Dict expires the Apple Inc. entry. The next ingestion batch arrives, finds an empty Dict, takes the lock, and calls L3. L3 hits the database, finds the existing row, returns the existing ID. _The lock + Queue still saved 49 database round-trips — just on a lookup instead of a mint._

In the flow, L3 sits inside the lock holder's branch:

```python
if acquired:
    try:
        value = await self._resolve_in_db(key)
        await self.d.put.aio(result_key, {"value": value, "schema": 1})
        # …notify waiters…
```

Why inside the lock? Because L3 reads are cheap relative to a stampede, but expensive relative to L2. You do not want every waiter independently hitting the database — the lock holder is the one canonical resolver, and the result fans out via Dict + Queue.

Two latency tradeoffs that bite:

- **The hop itself.** L3 sits across whatever network boundary separates Modal from your DB (peering, VPC, public internet). Tens of milliseconds is normal, hundreds is not surprising if you've placed the DB in the wrong region. Pin both sides to the same region if you can.
- **Connection pooling.** Modal containers are ephemeral. Naïve per-call connections to Postgres will exhaust the pool fast. Use a connection pool inside each container (asyncpg's built-in pool), or front the database with PgBouncer.

## The simulator

Two Modal containers sharing an L2 Dict and an L3 database. Fire requests at them and watch where the work actually happens:

<div data-interactive="cache-simulator"></div>

A few scenarios worth firing:

- **Container A → GET** twice in a row on the same key. First request walks the full stack down to the database; second is an L1 hit and never leaves the container. _This is the 16-thread case in miniature — the second caller pays no network at all._
- **A → GET** then **B → GET**. B misses L1 (its own LRU is cold) but hits L2 and copies the value into its L1. The cross-container payoff — one database round-trip, two readers.
- **Restart** a container. L1 is gone. L2 saves you the database hop. If L2 is also gone (Modal Dict's 7-day window expired), L3 — the database — answers definitively.
- **Thundering herd (A + B)**. Both miss at once. Only one wins the lock; the other registers as a waiter, sleeps on the Queue, and gets the answer pushed to it. _This is the Apple Inc. race — one database call, two readers, instead of two database calls (or worse, two duplicate IDs)._

## How this is done in other tech stacks

This pattern (singleflight + distributed lock + notify) shows up on every substrate. Modal Dict + Queue is the closest equivalent to Redis `SET NX PX` + Pub/Sub, which is the most common production answer. Roughly:

| Substrate               | Atomic claim                                    | Notify                       | Lease / TTL       |
| ----------------------- | ----------------------------------------------- | ---------------------------- | ----------------- |
| **Modal**               | `Dict.put(skip_if_exists=True)`                 | `Queue` per-waiter partition | `partition_ttl`   |
| **Redis**               | `SET NX PX`                                     | `PUBLISH` / `SUBSCRIBE`      | `EXPIRE`          |
| **etcd / Consul / ZK**  | txn with revision/create check                  | `Watch`                      | lease             |
| **Memcached**           | `add`                                           | (polling)                    | `EXPIRE`          |
| **DynamoDB**            | `PutItem` + `attribute_not_exists`              | Streams → Lambda, or poll    | TTL attribute     |
| **Postgres**            | `INSERT ON CONFLICT` or `pg_advisory_lock`      | `LISTEN/NOTIFY`              | session / TTL row |
| **Go (in-process)**     | `sync.Mutex` per key                            | `chan struct{}` close        | n/a               |
| **Python (in-process)** | `asyncio.Lock` + a `Future` stored in the cache | `await future`               | n/a               |

The neat in-process trick is **store the Future, not the value** — the first caller starts the work and stores its `asyncio.Future` (or `sync.Once`, or Guava's `LoadingCache` entry); subsequent callers find the Future and await it. The Future _is_ the lock.

If you already pay for Redis, the Modal version isn't doing anything new — same shape, different vendor. If you don't, building it on Dict + Queue saves you a Redis cluster.

The `INSERT ON CONFLICT` row in the table above isn't an _alternative_ to the cache pattern — in the entity-resolution shape it's part of the same design. The constraint enforces correctness at L3; the cache pattern shaves the latency cost of getting there. If your read-after-write throughput is low enough that the database can absorb every request directly, skip the cache. Otherwise both layers earn their keep — defence in depth.

## When not to bother

If your hot set is small enough that the database can serve every lookup directly, none of this earns its keep. And this is a read-mostly cache — if writes happen elsewhere and you need the cache to stay consistent, you need a `cache.invalidate(key)` discipline on every write path.

## The repo

[Full code here](https://github.com/kayvane1/blog).
