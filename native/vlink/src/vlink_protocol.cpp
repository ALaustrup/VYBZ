#include "vlink_protocol.h"

#include <cmath>
#include <cstdio>
#include <cstring>
#include <sstream>

void vlink_encode_pcm(uint8_t* dst, const float* interleaved, int frames, int sampleRate) {
  dst[0] = 0x56;
  dst[1] = 0x59;
  dst[2] = 0x42;
  dst[3] = 0x5A;
  dst[4] = VLINK_PROTO;
  dst[5] = 2;
  dst[6] = 0;
  dst[7] = 0;
  dst[8] = static_cast<uint8_t>(sampleRate & 0xff);
  dst[9] = static_cast<uint8_t>((sampleRate >> 8) & 0xff);
  dst[10] = static_cast<uint8_t>((sampleRate >> 16) & 0xff);
  dst[11] = static_cast<uint8_t>((sampleRate >> 24) & 0xff);
  const uint32_t fc = static_cast<uint32_t>(frames);
  dst[12] = static_cast<uint8_t>(fc & 0xff);
  dst[13] = static_cast<uint8_t>((fc >> 8) & 0xff);
  dst[14] = static_cast<uint8_t>((fc >> 16) & 0xff);
  dst[15] = static_cast<uint8_t>((fc >> 24) & 0xff);
  std::memcpy(dst + VLINK_HEADER, interleaved, static_cast<size_t>(frames) * 2 * sizeof(float));
}

static std::string json_escape(const char* s) {
  std::string o;
  o.reserve(std::strlen(s) + 8);
  for (const char* p = s; *p; ++p) {
    if (*p == '"' || *p == '\\') {
      o.push_back('\\');
      o.push_back(*p);
    } else if (static_cast<unsigned char>(*p) < 0x20) {
      o.push_back(' ');
    } else {
      o.push_back(*p);
    }
  }
  return o;
}

static std::string num_or_null(bool have, double v) {
  if (!have) return "null";
  char buf[64];
  std::snprintf(buf, sizeof(buf), "%.8g", v);
  return buf;
}

std::string vlink_json_hello(const VLinkInfo& info) {
  std::ostringstream o;
  o << "{\"type\":\"hello\",\"info\":{"
    << "\"dawName\":\"" << json_escape(info.dawName) << "\","
    << "\"pluginFormat\":\"vst3\","
    << "\"pluginName\":\"" << VLINK_NAME << "\","
    << "\"pluginVersion\":\"" << VLINK_VERSION << "\","
    << "\"sampleRate\":" << info.sampleRate << ","
    << "\"channels\":2,"
    << "\"bufferSize\":" << info.bufferSize << ","
    << "\"latencyMs\":" << info.latencyMs
    << "}}";
  return o.str();
}

std::string vlink_json_meter(const VLinkMeter& m) {
  std::ostringstream o;
  o << "{\"type\":\"meter\",\"meter\":{"
    << "\"peakL\":" << m.peakL << ","
    << "\"peakR\":" << m.peakR << ","
    << "\"rmsL\":" << m.rmsL << ","
    << "\"rmsR\":" << m.rmsR << ","
    << "\"lufsIntegrated\":" << m.lufsLike << ","
    << "\"truePeak\":" << m.samplePeakDbfs
    << "}}";
  return o.str();
}

std::string vlink_json_transport(const VLinkTransport& t) {
  std::ostringstream o;
  o << "{\"type\":\"transport\",\"transport\":{"
    << "\"playing\":" << (t.playing ? "true" : "false") << ","
    << "\"recording\":" << (t.recording ? "true" : "false") << ","
    << "\"cycling\":" << (t.cycling ? "true" : "false") << ","
    << "\"sampleRate\":" << t.sampleRate << ","
    << "\"tempoBpm\":" << num_or_null(t.haveTempo, t.tempoBpm) << ","
    << "\"timeSigNum\":" << (t.haveTimeSig ? std::to_string(t.timeSigNum) : "null") << ","
    << "\"timeSigDen\":" << (t.haveTimeSig ? std::to_string(t.timeSigDen) : "null") << ","
    << "\"projectTimeSamples\":" << (t.haveProjectTime ? std::to_string(t.projectTimeSamples) : "null")
    << "}}";
  return o.str();
}

std::string vlink_json_status(const char* status) {
  std::ostringstream o;
  o << "{\"type\":\"status\",\"status\":\"" << status << "\"}";
  return o.str();
}

std::string vlink_json_info(const VLinkInfo& info, const VLinkTransport& t) {
  std::ostringstream o;
  o << "{\"plugin\":\"" << VLINK_NAME << "\",\"version\":\"" << VLINK_VERSION << "\","
    << "\"dawName\":\"" << json_escape(info.dawName) << "\","
    << "\"sampleRate\":" << info.sampleRate << ","
    << "\"bufferSize\":" << info.bufferSize << ","
    << "\"sync\":\"process-buffer + host ProcessContext\","
    << "\"doesNotEnumerateProject\":true,"
    << "\"transport\":{"
    << "\"playing\":" << (t.playing ? "true" : "false") << ","
    << "\"tempoBpm\":" << num_or_null(t.haveTempo, t.tempoBpm)
    << "}}";
  return o.str();
}

std::string vlink_json_api_result(const char* id, bool ok, const std::string& bodyOrError) {
  std::ostringstream o;
  o << "{\"type\":\"api-result\",\"id\":\"" << json_escape(id) << "\",\"ok\":" << (ok ? "true" : "false") << ",";
  if (ok) o << "\"result\":" << bodyOrError;
  else o << "\"error\":\"" << json_escape(bodyOrError.c_str()) << "\"";
  o << "}";
  return o.str();
}

static bool extract_string(const char* json, const char* key, char* out, size_t cap) {
  std::string pat = std::string("\"") + key + "\"";
  const char* p = std::strstr(json, pat.c_str());
  if (!p) return false;
  p = std::strchr(p + pat.size(), ':');
  if (!p) return false;
  ++p;
  while (*p == ' ' || *p == '\t') ++p;
  if (*p != '"') return false;
  ++p;
  size_t n = 0;
  while (*p && *p != '"' && n + 1 < cap) out[n++] = *p++;
  out[n] = 0;
  return n > 0;
}

bool vlink_is_ping(const char* json) {
  return json && std::strstr(json, "\"ping\"") != nullptr && std::strstr(json, "\"type\"") != nullptr;
}

bool vlink_parse_api(const char* json, char* idOut, size_t idCap, char* methodOut, size_t methodCap) {
  if (!json || !std::strstr(json, "\"api\"")) return false;
  return extract_string(json, "id", idOut, idCap) && extract_string(json, "method", methodOut, methodCap);
}
