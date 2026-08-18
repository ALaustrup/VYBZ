#include "vlink_server.h"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

#ifdef _WIN32
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "ws2_32.lib")
using socket_t = SOCKET;
constexpr socket_t kInvalid = INVALID_SOCKET;
#else
#error VLink server is implemented for Windows first
#endif

namespace {

std::mutex g_mu;
VLinkShared g_state;
std::atomic<bool> g_run{false};
std::thread g_thread;
std::atomic<int> g_clients{0};

constexpr int kMaxFrame = 8192;
constexpr int kPcmBytes = VLINK_HEADER + kMaxFrame * 2 * 4;

uint32_t sha1_rol(uint32_t v, int n) { return (v << n) | (v >> (32 - n)); }

void sha1(const uint8_t* data, size_t len, uint8_t out[20]) {
  uint32_t h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
  std::vector<uint8_t> msg(data, data + len);
  msg.push_back(0x80);
  while ((msg.size() % 64) != 56) msg.push_back(0);
  const uint64_t bits = static_cast<uint64_t>(len) * 8;
  for (int i = 7; i >= 0; --i) msg.push_back(static_cast<uint8_t>((bits >> (i * 8)) & 0xff));
  for (size_t off = 0; off < msg.size(); off += 64) {
    uint32_t w[80];
    for (int i = 0; i < 16; ++i) {
      w[i] = (uint32_t(msg[off + i * 4]) << 24) | (uint32_t(msg[off + i * 4 + 1]) << 16) |
             (uint32_t(msg[off + i * 4 + 2]) << 8) | uint32_t(msg[off + i * 4 + 3]);
    }
    for (int i = 16; i < 80; ++i) w[i] = sha1_rol(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    uint32_t a = h0, b = h1, c = h2, d = h3, e = h4;
    for (int i = 0; i < 80; ++i) {
      uint32_t f, k;
      if (i < 20) {
        f = (b & c) | ((~b) & d);
        k = 0x5A827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ED9EBA1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8F1BBCDC;
      } else {
        f = b ^ c ^ d;
        k = 0xCA62C1D6;
      }
      const uint32_t temp = sha1_rol(a, 5) + f + e + k + w[i];
      e = d;
      d = c;
      c = sha1_rol(b, 30);
      b = a;
      a = temp;
    }
    h0 += a;
    h1 += b;
    h2 += c;
    h3 += d;
    h4 += e;
  }
  const uint32_t hs[5] = {h0, h1, h2, h3, h4};
  for (int i = 0; i < 5; ++i) {
    out[i * 4] = static_cast<uint8_t>(hs[i] >> 24);
    out[i * 4 + 1] = static_cast<uint8_t>(hs[i] >> 16);
    out[i * 4 + 2] = static_cast<uint8_t>(hs[i] >> 8);
    out[i * 4 + 3] = static_cast<uint8_t>(hs[i]);
  }
}

std::string b64(const uint8_t* d, size_t n) {
  static const char* T = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  std::string o;
  for (size_t i = 0; i < n; i += 3) {
    const int v = (d[i] << 16) | ((i + 1 < n ? d[i + 1] : 0) << 8) | (i + 2 < n ? d[i + 2] : 0);
    o.push_back(T[(v >> 18) & 63]);
    o.push_back(T[(v >> 12) & 63]);
    o.push_back(i + 1 < n ? T[(v >> 6) & 63] : '=');
    o.push_back(i + 2 < n ? T[v & 63] : '=');
  }
  return o;
}

std::string ws_accept(const std::string& key) {
  const std::string s = key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
  uint8_t dig[20];
  sha1(reinterpret_cast<const uint8_t*>(s.data()), s.size(), dig);
  return b64(dig, 20);
}

bool send_all(socket_t s, const char* p, int n) {
  int sent = 0;
  while (sent < n) {
    const int r = send(s, p + sent, n - sent, 0);
    if (r <= 0) return false;
    sent += r;
  }
  return true;
}

bool ws_send(socket_t s, bool binary, const void* data, size_t n) {
  uint8_t hdr[10];
  int hlen = 2;
  hdr[0] = static_cast<uint8_t>(binary ? 0x82 : 0x81);
  if (n < 126) {
    hdr[1] = static_cast<uint8_t>(n);
  } else if (n < 65536) {
    hdr[1] = 126;
    hdr[2] = static_cast<uint8_t>(n >> 8);
    hdr[3] = static_cast<uint8_t>(n);
    hlen = 4;
  } else {
    return false;
  }
  return send_all(s, reinterpret_cast<const char*>(hdr), hlen) &&
         send_all(s, static_cast<const char*>(data), static_cast<int>(n));
}

bool ws_send_text(socket_t s, const std::string& t) { return ws_send(s, false, t.data(), t.size()); }

int pop_ring(float* dst, int maxFrames) {
  const uint32_t w = g_state.writeFrames.load(std::memory_order_acquire);
  uint32_t r = g_state.readFrames.load(std::memory_order_relaxed);
  if (w - r > static_cast<uint32_t>(VLINK_RING_FRAMES)) r = w - VLINK_RING_FRAMES;
  const int avail = static_cast<int>(w - r);
  const int n = std::min(avail, maxFrames);
  for (int i = 0; i < n; ++i) {
    const uint32_t idx = (r + static_cast<uint32_t>(i)) % VLINK_RING_FRAMES;
    dst[i * 2] = g_state.ring[idx * 2];
    dst[i * 2 + 1] = g_state.ring[idx * 2 + 1];
  }
  g_state.readFrames.store(r + static_cast<uint32_t>(n), std::memory_order_release);
  return n;
}

std::string header_val(const std::string& req, const char* name) {
  std::string lower = req;
  std::string key = name;
  for (char& c : lower) c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
  for (char& c : key) c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
  const auto pos = lower.find(key);
  if (pos == std::string::npos) return {};
  auto start = req.find(':', pos);
  if (start == std::string::npos) return {};
  ++start;
  while (start < req.size() && (req[start] == ' ' || req[start] == '\t')) ++start;
  auto end = req.find('\r', start);
  if (end == std::string::npos) end = req.size();
  return req.substr(start, end - start);
}

void tcp_tune(socket_t s) {
  BOOL yes = 1;
  setsockopt(s, IPPROTO_TCP, TCP_NODELAY, reinterpret_cast<const char*>(&yes), sizeof(yes));
}

// Consume one WebSocket frame from in. Returns: 1 ok, 0 need more, -1 close/error.
int take_ws_frame(std::string& in, int& opcode, std::string& payload) {
  if (in.size() < 2) return 0;
  const auto* b = reinterpret_cast<const uint8_t*>(in.data());
  opcode = b[0] & 0x0f;
  const bool masked = (b[1] & 0x80) != 0;
  uint64_t plen = b[1] & 0x7f;
  size_t off = 2;
  if (plen == 126) {
    if (in.size() < 4) return 0;
    plen = (uint64_t(b[2]) << 8) | b[3];
    off = 4;
  } else if (plen == 127) {
    return -1;
  }
  const size_t need = off + (masked ? 4 : 0) + static_cast<size_t>(plen);
  if (in.size() < need) return 0;
  payload.assign(plen, '\0');
  if (masked) {
    const uint8_t* m = b + off;
    const uint8_t* d = b + off + 4;
    for (uint64_t i = 0; i < plen; ++i) payload[static_cast<size_t>(i)] = static_cast<char>(d[i] ^ m[i % 4]);
  } else {
    payload.assign(in.data() + off, static_cast<size_t>(plen));
  }
  in.erase(0, need);
  return 1;
}

void handle_api_text(socket_t s, const std::string& json) {
  if (vlink_is_ping(json.c_str())) {
    ws_send_text(s, "{\"type\":\"pong\"}");
    return;
  }
  char id[64] = {};
  char method[64] = {};
  if (!vlink_parse_api(json.c_str(), id, sizeof(id), method, sizeof(method))) return;
  std::lock_guard<std::mutex> lock(g_mu);
  if (std::strcmp(method, "vlink.info") == 0) {
    ws_send_text(s, vlink_json_api_result(id, true, vlink_json_info(g_state.info, g_state.transport)));
  } else if (std::strcmp(method, "vlink.transport") == 0) {
    std::string body = vlink_json_transport(g_state.transport);
    // wrap as result object: strip {"type":...} — send transport object only
    ws_send_text(s, vlink_json_api_result(id, true, body));
  } else if (std::strcmp(method, "vlink.meters") == 0) {
    if (!g_state.meter.have) {
      ws_send_text(s, vlink_json_api_result(id, false, "Not measured"));
    } else {
      ws_send_text(s, vlink_json_api_result(id, true, vlink_json_meter(g_state.meter)));
    }
  } else if (std::strcmp(method, "vlink.hello") == 0) {
    ws_send_text(s, vlink_json_api_result(id, true, vlink_json_hello(g_state.info)));
  } else {
    ws_send_text(s, vlink_json_api_result(id, false, "unknown method"));
  }
}

void stream_client(socket_t s, bool audio) {
  g_clients.fetch_add(1);
  tcp_tune(s);
  {
    std::lock_guard<std::mutex> lock(g_mu);
    // Order the existing client expects: hello first, then status, then extras.
    ws_send_text(s, vlink_json_hello(g_state.info));
    ws_send_text(s, vlink_json_status(g_state.streaming.load() ? "streaming" : "connected"));
    ws_send_text(s, vlink_json_transport(g_state.transport));
    if (g_state.meter.have) ws_send_text(s, vlink_json_meter(g_state.meter));
  }

  u_long nonblock = 1;
  ioctlsocket(s, FIONBIO, &nonblock);

  uint8_t pcm[kPcmBytes];
  float block[kMaxFrame * 2];
  std::string in;
  bool announcedStreaming = g_state.streaming.load();
  int meterTick = 0;

  while (g_run.load()) {
    char chunk[4096];
    const int got = recv(s, chunk, sizeof(chunk), 0);
    if (got > 0) {
      in.append(chunk, got);
      for (;;) {
        int opcode = 0;
        std::string payload;
        const int st = take_ws_frame(in, opcode, payload);
        if (st == 0) break;
        if (st < 0 || opcode == 0x8) {
          g_clients.fetch_sub(1);
          closesocket(s);
          return;
        }
        if (opcode == 0x9) {
          if (payload.size() <= 125) {
            uint8_t hdr[2] = {0x8A, static_cast<uint8_t>(payload.size())};
            send_all(s, reinterpret_cast<const char*>(hdr), 2);
            if (!payload.empty()) send_all(s, payload.data(), static_cast<int>(payload.size()));
          }
        } else if (opcode == 0x1) {
          handle_api_text(s, payload);
        }
      }
    } else if (got == 0) {
      break;
    }

    if (audio) {
      const int frames = pop_ring(block, 512);
      if (frames > 0) {
        const int sr = g_state.sampleRate.load();
        vlink_encode_pcm(pcm, block, frames, sr);
        if (!ws_send(s, true, pcm, static_cast<size_t>(VLINK_HEADER + frames * 8))) break;
        if (!announcedStreaming) {
          if (!ws_send_text(s, vlink_json_status("streaming"))) break;
          announcedStreaming = true;
        }
      }
    }

    // Control extras at ~10 Hz so we don't drown the existing client.
    if (++meterTick >= 5) {
      meterTick = 0;
      std::lock_guard<std::mutex> lock(g_mu);
      if (!ws_send_text(s, vlink_json_transport(g_state.transport))) break;
      if (g_state.meter.have && !ws_send_text(s, vlink_json_meter(g_state.meter))) break;
    }
    Sleep(20);
  }
  g_clients.fetch_sub(1);
  closesocket(s);
}

void serve_one(socket_t s) {
  char buf[4096];
  const int n = recv(s, buf, sizeof(buf) - 1, 0);
  if (n <= 0) {
    closesocket(s);
    return;
  }
  buf[n] = 0;
  const std::string req(buf, n);
  const bool stream = req.find("GET /vybz-stream") == 0;
  const bool apiWs = req.find("GET /vlink") == 0;
  const bool info = req.find("GET /v1/info") == 0;
  const bool trans = req.find("GET /v1/transport") == 0;
  const bool meters = req.find("GET /v1/meters") == 0;

  if (info || trans || meters) {
    std::string body;
    {
      std::lock_guard<std::mutex> lock(g_mu);
      if (info) body = vlink_json_info(g_state.info, g_state.transport);
      else if (trans) body = vlink_json_transport(g_state.transport);
      else if (!g_state.meter.have) body = "{\"error\":\"Not measured\"}";
      else body = vlink_json_meter(g_state.meter);
    }
    std::string res = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\nContent-Length: " +
                      std::to_string(body.size()) + "\r\n\r\n" + body;
    send_all(s, res.data(), static_cast<int>(res.size()));
    closesocket(s);
    return;
  }

  if (!stream && !apiWs) {
    const char* res = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
    send_all(s, res, static_cast<int>(std::strlen(res)));
    closesocket(s);
    return;
  }

  const std::string key = header_val(req, "Sec-WebSocket-Key");
  if (key.empty()) {
    closesocket(s);
    return;
  }
  const std::string acc = ws_accept(key);
  const std::string res =
      "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + acc +
      "\r\n\r\n";
  if (!send_all(s, res.data(), static_cast<int>(res.size()))) {
    closesocket(s);
    return;
  }
  stream_client(s, stream);
}

void server_main() {
  WSADATA wsa;
  if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) return;
  socket_t ls = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
  if (ls == kInvalid) {
    WSACleanup();
    return;
  }
  BOOL yes = 1;
  setsockopt(ls, SOL_SOCKET, SO_REUSEADDR, reinterpret_cast<const char*>(&yes), sizeof(yes));
  sockaddr_in addr{};
  addr.sin_family = AF_INET;
  addr.sin_port = htons(VLINK_PORT);
  inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);
  tcp_tune(ls);
  if (bind(ls, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) != 0) {
    std::fprintf(stderr, "VLink: bind 127.0.0.1:%d failed (is another node already listening?)\n", VLINK_PORT);
    closesocket(ls);
    WSACleanup();
    return;
  }
  listen(ls, 8);
  u_long nonblock = 1;
  ioctlsocket(ls, FIONBIO, &nonblock);
  while (g_run.load()) {
    sockaddr_in cli{};
    int clen = sizeof(cli);
    const socket_t c = accept(ls, reinterpret_cast<sockaddr*>(&cli), &clen);
    if (c != kInvalid) {
      std::thread(serve_one, c).detach();
    } else {
      Sleep(10);
    }
  }
  closesocket(ls);
  WSACleanup();
}

} // namespace

VLinkShared& vlink_state() { return g_state; }

void vlink_push_block(const float* interleaved, int frames, int sampleRate) {
  if (frames < 1) return;
  g_state.sampleRate.store(sampleRate, std::memory_order_relaxed);
  uint32_t w = g_state.writeFrames.load(std::memory_order_relaxed);
  float peakL = 0, peakR = 0, accL = 0, accR = 0;
  for (int i = 0; i < frames; ++i) {
    const float l = interleaved[i * 2];
    const float r = interleaved[i * 2 + 1];
    const uint32_t idx = w % VLINK_RING_FRAMES;
    g_state.ring[idx * 2] = l;
    g_state.ring[idx * 2 + 1] = r;
    ++w;
    const float al = std::fabs(l), ar = std::fabs(r);
    if (al > peakL) peakL = al;
    if (ar > peakR) peakR = ar;
    accL += l * l;
    accR += r * r;
  }
  g_state.writeFrames.store(w, std::memory_order_release);
  g_state.streaming.store(true, std::memory_order_relaxed);

  const float rmsL = std::sqrt(accL / static_cast<float>(frames));
  const float rmsR = std::sqrt(accR / static_cast<float>(frames));
  const float peak = std::max(peakL, peakR);
  const double meanSq = (accL + accR) / (2.0 * frames);
  const double lufsLike = meanSq > 1e-12 ? -0.691 + 10.0 * std::log10(meanSq) : -70.0;
  const double dbfs = peak > 1e-12 ? 20.0 * std::log10(static_cast<double>(peak)) : -144.0;

  std::lock_guard<std::mutex> lock(g_mu);
  g_state.meter.peakL = std::min(1.f, peakL);
  g_state.meter.peakR = std::min(1.f, peakR);
  g_state.meter.rmsL = std::min(1.f, rmsL);
  g_state.meter.rmsR = std::min(1.f, rmsR);
  g_state.meter.lufsLike = lufsLike;
  g_state.meter.samplePeakDbfs = dbfs;
  g_state.meter.have = true;
}

void vlink_set_info(const VLinkInfo& info) {
  std::lock_guard<std::mutex> lock(g_mu);
  g_state.info = info;
  g_state.bufferSize.store(info.bufferSize, std::memory_order_relaxed);
  g_state.sampleRate.store(info.sampleRate, std::memory_order_relaxed);
}

void vlink_set_transport(const VLinkTransport& t) {
  std::lock_guard<std::mutex> lock(g_mu);
  g_state.transport = t;
}

void vlink_server_start() {
  bool expected = false;
  if (!g_run.compare_exchange_strong(expected, true)) return;
  g_thread = std::thread(server_main);
}

void vlink_server_stop() {
  if (!g_run.exchange(false)) return;
  if (g_thread.joinable()) g_thread.join();
}

bool vlink_server_running() { return g_run.load(); }
