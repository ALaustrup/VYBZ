#include "vlink_server.h"

#include <cstdio>
#include <cstring>
#include <thread>

#ifdef _WIN32
#include <windows.h>
#endif

int main() {
  VLinkInfo info{};
  std::strncpy(info.dawName, "VLinkNode", sizeof(info.dawName) - 1);
  info.sampleRate = 48000;
  info.bufferSize = 256;
  info.latencyMs = 0;
  vlink_set_info(info);
  vlink_server_start();
  std::printf("VLink node on ws://127.0.0.1:%d/vybz-stream  (HTTP /v1/info)\n", VLINK_PORT);
  std::printf("No DAW attached — serving silence until you insert the VST3.\n");
  std::printf("Ctrl+C to quit.\n");

  float block[512] = {};
  VLinkTransport tr{};
  tr.sampleRate = 48000;
  vlink_set_transport(tr);

  while (vlink_server_running()) {
    vlink_push_block(block, 256, 48000);
#ifdef _WIN32
    Sleep(5);
#else
    std::this_thread::sleep_for(std::chrono::milliseconds(5));
#endif
  }
  vlink_server_stop();
  return 0;
}
