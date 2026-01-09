---
title: Building a mini game with GPT-5.2-Codex, Suno and GPT Image Gen
date: 2026-01-02
summary: We speed-ran a playable Farkle web game in about an hour using GPT-5.2-Codex for the core build, GPT Image Gen for character art, and Suno for a Game Boy-style theme.
tags: [llm, game-dev, gpt, suno, image-gen]
github: https://github.com/kayvane1/farkle
---

**TL;DR**: Over a Christmas holiday sprint, a friend and I built a playable web version of Farkle in about an hour. GPT-5.2-Codex handled the core game build, GPT Image Gen created character art, and Suno gave us a nostalgic chiptune theme.

---

## The idea

Farkle is a simple dice game we play all the time. The mechanics are straightforward, which made it a good candidate for a true "one shot" test. We wanted to see how far GPT-5.2-Codex could go from just the game name, without spelling out the rules.

It landed surprisingly close. The game was playable out of the gate, even though the rules it inferred weren't exactly the same as ours. That gave us a solid base to iterate on.

## The iteration loop

From there we went back and forth updating the site, tightening the game dynamics, and adding little touches:

- tightening turn flow and scoring
- small animations to make rolls feel alive
- extra UI polish to keep it clean and fast

The feedback loop was fast enough that we could treat it like a speed-run. We would ask for a change, test it, then push it a bit further.

## Layering in other models

Once the core was fun, we added personality:

- **GPT Image Gen** for character images you can pick from
- **Suno** for a little theme tune with an old-school Game Boy vibe

These touches made the game feel complete instead of just functional.

## Links

- Repo: https://github.com/kayvane1/farkle
- Live demo: https://farkle-jade.vercel.app/

## Takeaway

After an hour or so of speed running the game we were amazed by what these systems allowed us to build. It's both frightening and exciting that the next generation can imagine games and build them on the spot.
