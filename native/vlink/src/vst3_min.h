// Minimal VST3 ABI used by VLink. Independently written from the published
// interface IDs and struct field order. Not a copy of the Steinberg SDK.
#pragma once

#include <cstdint>
#include <cstring>

#if defined(_WIN32)
#define VLINK_API __stdcall
#else
#define VLINK_API
#endif

namespace v3 {

using int32 = int32_t;
using uint32 = uint32_t;
using int64 = int64_t;
using uint64 = uint64_t;
using tresult = int32;
using TBool = uint8_t;
using TUID = char[16];
using FIDString = const char*;
using TSamples = int64;
using TQuarterNotes = double;
using SampleRate = double;
using SpeakerArrangement = uint64;

constexpr tresult kResultOk = 0;
constexpr tresult kResultTrue = 0;
constexpr tresult kResultFalse = 1;
constexpr tresult kNoInterface = -1;
constexpr tresult kNotImplemented = -2;
constexpr tresult kInvalidArgument = -4;
constexpr tresult kNotInitialized = -7;

constexpr int32 kAudio = 0;
constexpr int32 kInput = 0;
constexpr int32 kOutput = 1;
constexpr int32 kMain = 0;
constexpr int32 kSample32 = 0;
constexpr uint32 kNoTail = 0;
constexpr SpeakerArrangement kStereo = 3; // L | R

inline void uid_from_u32(TUID out, uint32 a, uint32 b, uint32 c, uint32 d) {
  const uint32 w[4] = {a, b, c, d};
  for (int i = 0; i < 4; ++i) {
    out[i * 4 + 0] = static_cast<char>((w[i] >> 24) & 0xff);
    out[i * 4 + 1] = static_cast<char>((w[i] >> 16) & 0xff);
    out[i * 4 + 2] = static_cast<char>((w[i] >> 8) & 0xff);
    out[i * 4 + 3] = static_cast<char>(w[i] & 0xff);
  }
}

inline bool uid_eq(const void* a, const void* b) { return a && b && std::memcmp(a, b, 16) == 0; }

#if defined(_M_X64) || defined(__x86_64__)
#pragma pack(push, 16)
#else
#pragma pack(push, 8)
#endif

struct FUnknown {
  virtual tresult VLINK_API queryInterface(const TUID iid, void** obj) = 0;
  virtual uint32 VLINK_API addRef() = 0;
  virtual uint32 VLINK_API release() = 0;
};

struct IPluginBase : FUnknown {
  virtual tresult VLINK_API initialize(FUnknown* context) = 0;
  virtual tresult VLINK_API terminate() = 0;
};

struct BusInfo {
  int32 mediaType;
  int32 direction;
  int32 channelCount;
  char16_t name[128];
  int32 busType;
  uint32 flags;
};

struct RoutingInfo {
  int32 mediaType;
  int32 busIndex;
  int32 channel;
};

struct IBStream : FUnknown {
  virtual tresult VLINK_API read(void* buffer, int32 numBytes, int32* numBytesRead) = 0;
  virtual tresult VLINK_API write(void* buffer, int32 numBytes, int32* numBytesWritten) = 0;
  virtual tresult VLINK_API seek(int64 pos, int32 mode, int64* result) = 0;
  virtual tresult VLINK_API tell(int64* pos) = 0;
};

struct IComponent : IPluginBase {
  virtual tresult VLINK_API getControllerClassId(TUID classId) = 0;
  virtual tresult VLINK_API setIoMode(int32 mode) = 0;
  virtual int32 VLINK_API getBusCount(int32 type, int32 dir) = 0;
  virtual tresult VLINK_API getBusInfo(int32 type, int32 dir, int32 index, BusInfo& info) = 0;
  virtual tresult VLINK_API getRoutingInfo(RoutingInfo& in, RoutingInfo& out) = 0;
  virtual tresult VLINK_API activateBus(int32 type, int32 dir, int32 index, TBool state) = 0;
  virtual tresult VLINK_API setActive(TBool state) = 0;
  virtual tresult VLINK_API setState(IBStream* state) = 0;
  virtual tresult VLINK_API getState(IBStream* state) = 0;
};

struct ProcessSetup {
  int32 processMode;
  int32 symbolicSampleSize;
  int32 maxSamplesPerBlock;
  SampleRate sampleRate;
};

struct AudioBusBuffers {
  int32 numChannels;
  uint64 silenceFlags;
  union {
    float** channelBuffers32;
    double** channelBuffers64;
  };
};

struct ProcessContext {
  uint32 state;
  double sampleRate;
  TSamples projectTimeSamples;
  int64 systemTime;
  TSamples continousTimeSamples;
  TQuarterNotes projectTimeMusic;
  TQuarterNotes barPositionMusic;
  TQuarterNotes cycleStartMusic;
  TQuarterNotes cycleEndMusic;
  double tempo;
  int32 timeSigNumerator;
  int32 timeSigDenominator;
  uint32 chord;
  uint8_t chordExtra[4];
  int32 smpteOffsetSubframes;
  uint32 frameRate;
  int32 samplesToNextClock;
};

// ProcessContext.state bits (published VST3 flags).
constexpr uint32 kPlaying = 1 << 1;
constexpr uint32 kCycleActive = 1 << 2;
constexpr uint32 kRecording = 1 << 3;
constexpr uint32 kSystemTimeValid = 1 << 8;
constexpr uint32 kContTimeValid = 1 << 17;
constexpr uint32 kProjectTimeMusicValid = 1 << 9;
constexpr uint32 kBarPositionValid = 1 << 11;
constexpr uint32 kCycleValid = 1 << 12;
constexpr uint32 kTempoValid = 1 << 10;
constexpr uint32 kTimeSigValid = 1 << 13;
constexpr uint32 kClockValid = 1 << 14;
constexpr uint32 kSmpteValid = 1 << 15;
constexpr uint32 kProjectTimeSamplesValid = 1 << 0;

struct ProcessData {
  int32 processMode;
  int32 symbolicSampleSize;
  int32 numSamples;
  int32 numInputs;
  int32 numOutputs;
  AudioBusBuffers* inputs;
  AudioBusBuffers* outputs;
  FUnknown* inputParameterChanges;
  FUnknown* outputParameterChanges;
  FUnknown* inputEvents;
  FUnknown* outputEvents;
  ProcessContext* processContext;
};

struct IAudioProcessor : FUnknown {
  virtual tresult VLINK_API setBusArrangements(SpeakerArrangement* inputs, int32 numIns,
                                               SpeakerArrangement* outputs, int32 numOuts) = 0;
  virtual tresult VLINK_API getBusArrangement(int32 dir, int32 index, SpeakerArrangement& arr) = 0;
  virtual tresult VLINK_API canProcessSampleSize(int32 symbolicSampleSize) = 0;
  virtual uint32 VLINK_API getLatencySamples() = 0;
  virtual tresult VLINK_API setupProcessing(ProcessSetup& setup) = 0;
  virtual tresult VLINK_API setProcessing(TBool state) = 0;
  virtual tresult VLINK_API process(ProcessData& data) = 0;
  virtual uint32 VLINK_API getTailSamples() = 0;
};

struct IProcessContextRequirements : FUnknown {
  virtual uint32 VLINK_API getProcessContextRequirements() = 0;
};

struct PFactoryInfo {
  char vendor[64];
  char url[256];
  char email[128];
  int32 flags;
};

struct PClassInfo {
  TUID cid;
  int32 cardinality;
  char category[32];
  char name[64];
};

struct PClassInfo2 {
  TUID cid;
  int32 cardinality;
  char category[32];
  char name[64];
  uint32 classFlags;
  char subCategories[128];
  char vendor[64];
  char version[64];
  char sdkVersion[64];
};

struct IPluginFactory : FUnknown {
  virtual tresult VLINK_API getFactoryInfo(PFactoryInfo* info) = 0;
  virtual int32 VLINK_API countClasses() = 0;
  virtual tresult VLINK_API getClassInfo(int32 index, PClassInfo* info) = 0;
  virtual tresult VLINK_API createInstance(FIDString cid, FIDString iid, void** obj) = 0;
};

struct IPluginFactory2 : IPluginFactory {
  virtual tresult VLINK_API getClassInfo2(int32 index, PClassInfo2* info) = 0;
};

struct IHostApplication : FUnknown {
  virtual tresult VLINK_API getName(char16_t name[128]) = 0;
  virtual tresult VLINK_API createInstance(TUID cid, TUID iid, void** obj) = 0;
};

struct IEditController : IPluginBase {
  virtual tresult VLINK_API setComponentState(IBStream* state) = 0;
  virtual tresult VLINK_API setState(IBStream* state) = 0;
  virtual tresult VLINK_API getState(IBStream* state) = 0;
  virtual int32 VLINK_API getParameterCount() = 0;
  virtual tresult VLINK_API getParameterInfo(int32 index, void* info) = 0;
  virtual tresult VLINK_API getParamStringByValue(uint32 id, double valueNormalized, char16_t string[128]) = 0;
  virtual tresult VLINK_API getParamValueByString(uint32 id, char16_t* string, double& valueNormalized) = 0;
  virtual double VLINK_API normalizedParamToPlain(uint32 id, double valueNormalized) = 0;
  virtual double VLINK_API plainParamToNormalized(uint32 id, double plainValue) = 0;
  virtual double VLINK_API getParamNormalized(uint32 id) = 0;
  virtual tresult VLINK_API setParamNormalized(uint32 id, double value) = 0;
  virtual tresult VLINK_API setComponentHandler(FUnknown* handler) = 0;
  virtual FUnknown* VLINK_API createView(FIDString name) = 0;
};

#pragma pack(pop)

// Published interface IDs.
inline void iid_FUnknown(TUID o) { uid_from_u32(o, 0x00000000, 0x00000000, 0xC0000000, 0x00000046); }
inline void iid_IPluginBase(TUID o) { uid_from_u32(o, 0x22888DDB, 0x156E45AE, 0x8358B348, 0x08190625); }
inline void iid_IComponent(TUID o) { uid_from_u32(o, 0xE831FF31, 0xF2D54301, 0x928EBBEE, 0x25697802); }
inline void iid_IAudioProcessor(TUID o) { uid_from_u32(o, 0x42043F99, 0xB7DA453C, 0xA569E79D, 0x9AAEC33D); }
inline void iid_IProcessContextRequirements(TUID o) {
  uid_from_u32(o, 0x2A654303, 0xEF764E3D, 0x95B5FE83, 0x730EF6D0);
}
inline void iid_IPluginFactory(TUID o) { uid_from_u32(o, 0x7A4D811C, 0x52114A1F, 0xAED9D2EE, 0x0B43BF9F); }
inline void iid_IPluginFactory2(TUID o) { uid_from_u32(o, 0x0007B650, 0xF24B4C0B, 0xA464EDB9, 0xF00B2ABB); }
inline void iid_IHostApplication(TUID o) { uid_from_u32(o, 0x58E595CC, 0xDB2D4969, 0x8B6AAF8C, 0x36A664E5); }
inline void iid_IEditController(TUID o) { uid_from_u32(o, 0xDCD7BBE3, 0x7742448D, 0xA874AACC, 0x979C759E); }

// VLink class IDs (stable, ours).
inline void cid_Processor(TUID o) { uid_from_u32(o, 0x564C494E, 0x4B565942, 0x5A313330, 0x50524F43); }
inline void cid_Controller(TUID o) { uid_from_u32(o, 0x564C494E, 0x4B565942, 0x5A313330, 0x434E5452); }

} // namespace v3
