#pragma once

#include <cstdint>
#include <string>

constexpr uint32_t VLINK_MAGIC = 0x5659425A; // "VYBZ"
constexpr uint8_t VLINK_PROTO = 1;
constexpr int VLINK_HEADER = 16;
constexpr int VLINK_PORT = 48480;
constexpr const char* VLINK_NAME = "VLink";
constexpr const char* VLINK_VERSION = "0.1.0";

struct VLinkMeter {
  float peakL = 0;
  float peakR = 0;
  float rmsL = 0;
  float rmsR = 0;
  double lufsLike = 0; // running mean-square → LUFS-like; not BS.1770-4
  double samplePeakDbfs = -144;
  bool have = false;
};

struct VLinkTransport {
  bool playing = false;
  bool recording = false;
  bool cycling = false;
  bool haveTempo = false;
  bool haveTimeSig = false;
  bool haveProjectTime = false;
  double tempoBpm = 0;
  int timeSigNum = 0;
  int timeSigDen = 0;
  int64_t projectTimeSamples = 0;
  double sampleRate = 48000;
};

struct VLinkInfo {
  char dawName[128] = "Unknown host";
  int sampleRate = 48000;
  int bufferSize = 256;
  double latencyMs = 0;
};

void vlink_encode_pcm(uint8_t* dst, const float* interleaved, int frames, int sampleRate);
std::string vlink_json_hello(const VLinkInfo& info);
std::string vlink_json_meter(const VLinkMeter& m);
std::string vlink_json_transport(const VLinkTransport& t);
std::string vlink_json_status(const char* status);
std::string vlink_json_info(const VLinkInfo& info, const VLinkTransport& t);
std::string vlink_json_api_result(const char* id, bool ok, const std::string& bodyOrError);
bool vlink_is_ping(const char* json);
bool vlink_parse_api(const char* json, char* idOut, size_t idCap, char* methodOut, size_t methodCap);
