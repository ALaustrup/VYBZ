#pragma once

#include "vlink_protocol.h"

#include <atomic>
#include <cstdint>

constexpr int VLINK_RING_FRAMES = 8192 * 8;

struct VLinkShared {
  std::atomic<uint32_t> writeFrames{0};
  std::atomic<uint32_t> readFrames{0};
  float ring[VLINK_RING_FRAMES * 2]{};
  std::atomic<int> sampleRate{48000};
  std::atomic<int> bufferSize{256};
  VLinkInfo info{};
  VLinkMeter meter{};
  VLinkTransport transport{};
  std::atomic<bool> streaming{false};
};

VLinkShared& vlink_state();
void vlink_push_block(const float* interleaved, int frames, int sampleRate);
void vlink_set_info(const VLinkInfo& info);
void vlink_set_transport(const VLinkTransport& t);
void vlink_server_start();
void vlink_server_stop();
bool vlink_server_running();
