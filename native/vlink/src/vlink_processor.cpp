#include "vlink_server.h"
#include "vst3_min.h"

#include <algorithm>
#include <atomic>
#include <cstring>
#include <vector>

using namespace v3;

static void copy_utf16(char16_t* dst, const char* src, size_t cap) {
  size_t i = 0;
  for (; src[i] && i + 1 < cap; ++i) dst[i] = static_cast<char16_t>(static_cast<unsigned char>(src[i]));
  dst[i] = 0;
}

static void utf16_to_utf8(const char16_t* src, char* dst, size_t cap) {
  size_t i = 0;
  for (; src[i] && i + 1 < cap; ++i) {
    const char16_t c = src[i];
    dst[i] = c < 128 ? static_cast<char>(c) : '?';
  }
  dst[i] = 0;
}

class VLinkProcessor : public IComponent, public IAudioProcessor, public IProcessContextRequirements {
public:
  VLinkProcessor() { uid_from_u32(controllerCid_, 0x564C494E, 0x4B565942, 0x5A313330, 0x434E5452); }

  tresult VLINK_API queryInterface(const TUID iid, void** obj) override {
    if (!obj) return kInvalidArgument;
    TUID t;
    iid_FUnknown(t);
    iid_IPluginBase(t);
    auto match = [&](void (*fn)(TUID), void* ptr) -> bool {
      TUID x;
      fn(x);
      if (uid_eq(iid, x)) {
        *obj = ptr;
        addRef();
        return true;
      }
      return false;
    };
    if (match(iid_FUnknown, static_cast<IComponent*>(this))) return kResultOk;
    if (match(iid_IPluginBase, static_cast<IComponent*>(this))) return kResultOk;
    if (match(iid_IComponent, static_cast<IComponent*>(this))) return kResultOk;
    if (match(iid_IAudioProcessor, static_cast<IAudioProcessor*>(this))) return kResultOk;
    if (match(iid_IProcessContextRequirements, static_cast<IProcessContextRequirements*>(this))) return kResultOk;
    *obj = nullptr;
    return kNoInterface;
  }

  uint32 VLINK_API addRef() override { return ++refs_; }
  uint32 VLINK_API release() override {
    const uint32 n = --refs_;
    if (n == 0) delete this;
    return n;
  }

  tresult VLINK_API initialize(FUnknown* context) override {
    if (context) {
      TUID hostIid;
      iid_IHostApplication(hostIid);
      void* raw = nullptr;
      if (context->queryInterface(hostIid, &raw) == kResultOk && raw) {
        auto* host = static_cast<IHostApplication*>(raw);
        char16_t name[128] = {};
        if (host->getName(name) == kResultOk) utf16_to_utf8(name, info_.dawName, sizeof(info_.dawName));
        host->release();
      }
    }
    if (info_.dawName[0] == 0) std::strncpy(info_.dawName, "Unknown host", sizeof(info_.dawName) - 1);
    vlink_set_info(info_);
    vlink_server_start();
    return kResultOk;
  }

  tresult VLINK_API terminate() override { return kResultOk; }

  tresult VLINK_API getControllerClassId(TUID classId) override {
    std::memcpy(classId, controllerCid_, 16);
    return kResultOk;
  }
  tresult VLINK_API setIoMode(int32) override { return kResultOk; }
  int32 VLINK_API getBusCount(int32 type, int32) override { return type == kAudio ? 1 : 0; }
  tresult VLINK_API getBusInfo(int32 type, int32 dir, int32 index, BusInfo& info) override {
    if (type != kAudio || index != 0) return kInvalidArgument;
    info.mediaType = kAudio;
    info.direction = dir;
    info.channelCount = 2;
    info.busType = kMain;
    info.flags = 1; // default active
    copy_utf16(info.name, dir == kInput ? "In" : "Out", 128);
    return kResultOk;
  }
  tresult VLINK_API getRoutingInfo(RoutingInfo&, RoutingInfo&) override { return kNotImplemented; }
  tresult VLINK_API activateBus(int32, int32, int32, TBool) override { return kResultOk; }
  tresult VLINK_API setActive(TBool state) override {
    active_ = state != 0;
    return kResultOk;
  }
  tresult VLINK_API setState(IBStream*) override { return kResultOk; }
  tresult VLINK_API getState(IBStream*) override { return kResultOk; }

  tresult VLINK_API setBusArrangements(SpeakerArrangement* inputs, int32 numIns, SpeakerArrangement* outputs,
                                       int32 numOuts) override {
    if (numIns >= 1 && inputs) inArr_ = inputs[0] ? inputs[0] : kStereo;
    if (numOuts >= 1 && outputs) outArr_ = outputs[0] ? outputs[0] : kStereo;
    return (inArr_ == kStereo && outArr_ == kStereo) ? kResultTrue : kResultFalse;
  }
  tresult VLINK_API getBusArrangement(int32 dir, int32 index, SpeakerArrangement& arr) override {
    if (index != 0) return kInvalidArgument;
    arr = dir == kInput ? inArr_ : outArr_;
    return kResultOk;
  }
  tresult VLINK_API canProcessSampleSize(int32 symbolicSampleSize) override {
    return symbolicSampleSize == kSample32 ? kResultTrue : kResultFalse;
  }
  uint32 VLINK_API getLatencySamples() override { return 0; }
  tresult VLINK_API setupProcessing(ProcessSetup& setup) override {
    info_.sampleRate = setup.sampleRate > 0 ? static_cast<int>(setup.sampleRate + 0.5) : 48000;
    info_.bufferSize = setup.maxSamplesPerBlock > 0 ? setup.maxSamplesPerBlock : 256;
    info_.latencyMs = 0;
    scratch_.assign(static_cast<size_t>(info_.bufferSize) * 2, 0.f);
    vlink_set_info(info_);
    return kResultOk;
  }
  tresult VLINK_API setProcessing(TBool) override { return kResultOk; }

  tresult VLINK_API process(ProcessData& data) override {
    if (data.symbolicSampleSize != kSample32) return kResultFalse;
    const int n = data.numSamples;
    float* inL = nullptr;
    float* inR = nullptr;
    float* outL = nullptr;
    float* outR = nullptr;
    if (data.numInputs > 0 && data.inputs && data.inputs[0].numChannels >= 1)
      inL = data.inputs[0].channelBuffers32 ? data.inputs[0].channelBuffers32[0] : nullptr;
    if (data.numInputs > 0 && data.inputs && data.inputs[0].numChannels >= 2)
      inR = data.inputs[0].channelBuffers32 ? data.inputs[0].channelBuffers32[1] : nullptr;
    if (data.numOutputs > 0 && data.outputs && data.outputs[0].numChannels >= 1)
      outL = data.outputs[0].channelBuffers32 ? data.outputs[0].channelBuffers32[0] : nullptr;
    if (data.numOutputs > 0 && data.outputs && data.outputs[0].numChannels >= 2)
      outR = data.outputs[0].channelBuffers32 ? data.outputs[0].channelBuffers32[1] : nullptr;

    if (n < 1) {
      applyTransport(data);
      return kResultOk;
    }
    if (scratch_.size() < static_cast<size_t>(n) * 2)
      scratch_.assign(static_cast<size_t>(n) * 2, 0.f);
    for (int i = 0; i < n; ++i) {
      const float l = inL ? inL[i] : 0.f;
      const float r = inR ? inR[i] : l;
      scratch_[static_cast<size_t>(i) * 2] = l;
      scratch_[static_cast<size_t>(i) * 2 + 1] = r;
      if (outL) outL[i] = l;
      if (outR) outR[i] = r;
    }
    vlink_push_block(scratch_.data(), n, info_.sampleRate);
    applyTransport(data);
    return kResultOk;
  }

  void applyTransport(ProcessData& data) {
    VLinkTransport tr{};
    tr.sampleRate = info_.sampleRate;
    if (!data.processContext) {
      vlink_set_transport(tr);
      return;
    }
    const ProcessContext& c = *data.processContext;
    tr.playing = (c.state & kPlaying) != 0;
    tr.recording = (c.state & kRecording) != 0;
    tr.cycling = (c.state & kCycleActive) != 0;
    if (c.state & kTempoValid) {
      tr.haveTempo = true;
      tr.tempoBpm = c.tempo;
    }
    if (c.state & kTimeSigValid) {
      tr.haveTimeSig = true;
      tr.timeSigNum = c.timeSigNumerator;
      tr.timeSigDen = c.timeSigDenominator;
    }
    tr.haveProjectTime = true;
    tr.projectTimeSamples = c.projectTimeSamples;
    vlink_set_transport(tr);
  }

  uint32 VLINK_API getTailSamples() override { return kNoTail; }

  uint32 VLINK_API getProcessContextRequirements() override {
    return (1u << 6) | (1u << 7) | (1u << 10) | (1u << 2) | (1u << 3);
    // tempo, time sig, transport, project time music, bar
  }

private:
  std::atomic<uint32> refs_{1};
  TUID controllerCid_{};
  VLinkInfo info_{};
  SpeakerArrangement inArr_ = kStereo;
  SpeakerArrangement outArr_ = kStereo;
  bool active_ = false;
  std::vector<float> scratch_;
};

class VLinkController : public IEditController {
public:
  tresult VLINK_API queryInterface(const TUID iid, void** obj) override {
    if (!obj) return kInvalidArgument;
    auto match = [&](void (*fn)(TUID)) -> bool {
      TUID x;
      fn(x);
      if (uid_eq(iid, x)) {
        *obj = static_cast<IEditController*>(this);
        addRef();
        return true;
      }
      return false;
    };
    if (match(iid_FUnknown) || match(iid_IPluginBase) || match(iid_IEditController)) return kResultOk;
    *obj = nullptr;
    return kNoInterface;
  }
  uint32 VLINK_API addRef() override { return ++refs_; }
  uint32 VLINK_API release() override {
    const uint32 n = --refs_;
    if (n == 0) delete this;
    return n;
  }
  tresult VLINK_API initialize(FUnknown*) override { return kResultOk; }
  tresult VLINK_API terminate() override { return kResultOk; }
  tresult VLINK_API setComponentState(IBStream*) override { return kResultOk; }
  tresult VLINK_API setState(IBStream*) override { return kResultOk; }
  tresult VLINK_API getState(IBStream*) override { return kResultOk; }
  int32 VLINK_API getParameterCount() override { return 0; }
  tresult VLINK_API getParameterInfo(int32, void*) override { return kResultFalse; }
  tresult VLINK_API getParamStringByValue(uint32, double, char16_t string[128]) override {
    string[0] = 0;
    return kResultOk;
  }
  tresult VLINK_API getParamValueByString(uint32, char16_t*, double& valueNormalized) override {
    valueNormalized = 0;
    return kResultFalse;
  }
  double VLINK_API normalizedParamToPlain(uint32, double v) override { return v; }
  double VLINK_API plainParamToNormalized(uint32, double v) override { return v; }
  double VLINK_API getParamNormalized(uint32) override { return 0; }
  tresult VLINK_API setParamNormalized(uint32, double) override { return kResultOk; }
  tresult VLINK_API setComponentHandler(FUnknown*) override { return kResultOk; }
  FUnknown* VLINK_API createView(FIDString) override { return nullptr; }

private:
  std::atomic<uint32> refs_{1};
};

IComponent* vlink_create_processor() { return new VLinkProcessor(); }
IEditController* vlink_create_controller() { return new VLinkController(); }
