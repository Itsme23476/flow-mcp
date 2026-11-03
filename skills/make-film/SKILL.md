---
name: make-film
description: Make a short AI film in Google Flow from one sentence, using the flow MCP tools - character, free stills, paid clips under a credit budget, free narration, the final cut, and optionally a vertical captioned Short. Use when the user says "make a film/video about X", "make me a 30-second video", "make a Short about X" or "/make-film".
---

# Make a film with Google Flow

The user gives one sentence. You run the whole film with the `flow_*` tools, stopping only at the three checkpoints marked **STOP**.

## 0. Ask once, up front

Ask these in ONE message, each with a suggested default so the user can just say "go":

1. **Story**: one line. Default: expand their sentence into a 3-beat story (setup, turn, ending).
2. **Length**: default 30 seconds = 3 clips of 10 s.
3. **Budget**: default 45 credits (3 × 15). Must fit `budget.left_today` from `flow_status`.
4. **Voice**: default `Charon` for a narrator; offer 2 or 3 others from `flow_voices`.
5. **Format**: landscape (YouTube), or also a vertical Short with captions. Default landscape only.

## 1. Check the session

`flow_status`. If it returns a hint (not signed in, no project open), relay it and stop.
If the planned clips cost more than `budget.left_today`, say so and offer fewer clips. Never raise the daily limit with `flow_budget` unless the user asks.

## 2. Write the narration first

Write the narration to fit the length: about 2.5 words per second, so ~70 words for 30 s. Short sentences.
Record it with `flow_narrate` (engine `gemini` if `flow_voices` says gemini_ready, otherwise `mac`), with a one-line `style` note.
Its duration tells you how long the footage must run.

## 3. Character

`flow_character` with `describe`: one consistent look (shape, clothing with colours, one prop, art style), plus `personality` and `voice`.
Show the user the portrait path.

## 4. Key frames (free)

`flow_generate` with one `type: "image"` scene per clip boundary (clips + 1 stills: start of clip 1, end of each clip).
Put `reference_images: ["asset:<character>"]` on each, `reference_previous: true` on all but the first, and the same art style in every prompt.

**STOP 1**: show the stills and the plan for each clip. Fix any still the user doesn't like (images cost nothing). Continue only on their OK.

## 5. Clips (this spends credits)

One `flow_generate` call with every clip, in order:
- Clip 1: `first_frame` = still 1, `last_frame` = still 2.
- Clip N > 1: `chain_previous: true` (starts on the real last frame of clip N-1), `last_frame` = still N+1.
- Every clip: `duration: 10`, `resolution: "720p"`, `max_credits: 15`, and `aspect_ratio: "9:16"` if the user wants vertical-only.
- Use exact joins (`chain_previous`) while the scene stays in one place. If a clip jumps somewhere new, drop `chain_previous` and use `reference_images: ["asset:<character>"]` instead.

Tell the user the total before sending. Then `flow_wait` until `finished` is true. If a clip finished in Flow but no file arrived, use `flow_download`; never generate it again.

## 6. Cut

`flow_assemble` with the narration as `voiceover`, `clip_volume: 0.25`. If the narration is longer than the footage, say so: either trim the narration or accept a held last frame.

**STOP 2**: give the user the film's path to watch.

## 7. Vertical Short (only if asked)

1. `flow_vertical` on the final film (`blur` keeps the whole picture).
2. `flow_transcribe` the vertical file, show the words, fix likely mishearings.
3. **STOP 3**: get the user's OK on the words.
4. `flow_captions` with the agreed `text`, style `bold`.

## 8. Report

End with the file paths and the bill from `flow_budget`: credits spent on this film, and what's left today.
