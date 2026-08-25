# VLink

> **Not the product.** VYBZ is a social network. This plug-in is DAW ingest — a preserved capability. Read [`PRODUCT.md`](../../PRODUCT.md).

VST3 insert that is VYBZ’s DAW-side access node. Sit it on the master (or the bus you want heard). It passes audio through, and on loopback it serves the audio, the host transport the DAW actually gives us, and a small JSON API.

This is the plug-in PRODUCT.md calls **DAW Master Channel ingest**. Older copy said “VYBZ Broadcast”. Same port, same stream path.

## What it measures

From the host process buffer:

- Stereo 32-bit float audio (copied, not rewritten)
- Peak and RMS on that audio
- Sample-peak dBFS (not oversampled true peak)

From `ProcessContext`, and **only when the host sets the valid flags**:

- Playing / recording / cycling
- Tempo
- Time signature
- Project time in samples

## What it does not do

VST3 does not expose the project. VLink **does not** list tracks, clips, mixer sends, or other plug-ins. Unknown transport fields are omitted (`null` on the wire). It does not invent a tempo.

Loudness on the meter is a running mean-square converted to LUFS-like units. It is **not** BS.1770-4.

## Local API

Loopback only: `127.0.0.1:48480`.

| Path | Kind | Job |
|---|---|---|
| `/vybz-stream` | WebSocket | Existing VYBZ stream (hello, meter, transport, framed PCM) |
| `/vlink` | WebSocket | JSON methods: `vlink.info`, `vlink.transport`, `vlink.meters` |
| `/v1/info` | HTTP GET | Declared plug-in + last measured setup |
| `/v1/transport` | HTTP GET | Last measured transport, or omitted fields |
| `/v1/meters` | HTTP GET | Last measured meter |

The web app still connects to `ws://127.0.0.1:48480/vybz-stream`.

## Build (Windows x64)

Needs Visual Studio 2022 Build Tools (MSVC). No extra packages.

```bat
cd native\vlink
build.bat
```

Writes:

- `build/VLink.vst3` — VST3 bundle
- `build/VLinkNode.exe` — same server, no DAW, silence until you feed it

Scan the bundle in your DAW, or copy it to `%CommonProgramFiles%\VST3\`.

A compiled `.vst3` is **NATIVE-PLATFORM ONLY**. Source is in this folder. Do not commit the `build/` output.

## Insert

Stereo FX on the master. Throughput is 1:1. Latency reported to the host is 0 samples (we do not look ahead).
