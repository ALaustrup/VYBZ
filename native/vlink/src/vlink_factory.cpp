#ifdef _WIN32
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#endif

#include "vst3_min.h"

#include <atomic>
#include <cstring>

using namespace v3;

IComponent* vlink_create_processor();
IEditController* vlink_create_controller();

static void fill_str(char* dst, size_t cap, const char* s) {
  std::strncpy(dst, s, cap - 1);
  dst[cap - 1] = 0;
}

class VLinkFactory : public IPluginFactory2 {
public:
  tresult VLINK_API queryInterface(const TUID iid, void** obj) override {
    if (!obj) return kInvalidArgument;
    auto match = [&](void (*fn)(TUID)) -> bool {
      TUID x;
      fn(x);
      if (uid_eq(iid, x)) {
        *obj = static_cast<IPluginFactory2*>(this);
        addRef();
        return true;
      }
      return false;
    };
    if (match(iid_FUnknown) || match(iid_IPluginFactory) || match(iid_IPluginFactory2)) return kResultOk;
    *obj = nullptr;
    return kNoInterface;
  }
  uint32 VLINK_API addRef() override { return ++refs_; }
  uint32 VLINK_API release() override {
    const uint32 n = --refs_;
    if (n == 0) delete this;
    return n;
  }

  tresult VLINK_API getFactoryInfo(PFactoryInfo* info) override {
    if (!info) return kInvalidArgument;
    fill_str(info->vendor, sizeof(info->vendor), "VYBZ");
    fill_str(info->url, sizeof(info->url), "https://vybz.cloud");
    fill_str(info->email, sizeof(info->email), "none");
    info->flags = 1 << 4; // unicode
    return kResultOk;
  }
  int32 VLINK_API countClasses() override { return 2; }

  tresult VLINK_API getClassInfo(int32 index, PClassInfo* info) override {
    if (!info || index < 0 || index > 1) return kInvalidArgument;
    if (index == 0) cid_Processor(info->cid);
    else cid_Controller(info->cid);
    info->cardinality = 0x7FFFFFFF;
    fill_str(info->category, sizeof(info->category), index == 0 ? "Audio Module Class" : "Component Controller Class");
    fill_str(info->name, sizeof(info->name), "VLink");
    return kResultOk;
  }

  tresult VLINK_API getClassInfo2(int32 index, PClassInfo2* info) override {
    if (!info || index < 0 || index > 1) return kInvalidArgument;
    PClassInfo basic{};
    getClassInfo(index, &basic);
    std::memcpy(info->cid, basic.cid, 16);
    info->cardinality = basic.cardinality;
    fill_str(info->category, sizeof(info->category), basic.category);
    fill_str(info->name, sizeof(info->name), basic.name);
    info->classFlags = 0;
    fill_str(info->subCategories, sizeof(info->subCategories), index == 0 ? "Fx|Network" : "");
    fill_str(info->vendor, sizeof(info->vendor), "VYBZ");
    fill_str(info->version, sizeof(info->version), VLINK_VERSION_STR);
    fill_str(info->sdkVersion, sizeof(info->sdkVersion), "VST 3.7");
    return kResultOk;
  }

  tresult VLINK_API createInstance(FIDString cid, FIDString iid, void** obj) override {
    if (!cid || !iid || !obj) return kInvalidArgument;
    TUID wantProc, wantCtrl, iidComp, iidProc, iidCtrl, iidUnk;
    cid_Processor(wantProc);
    cid_Controller(wantCtrl);
    iid_IComponent(iidComp);
    iid_IAudioProcessor(iidProc);
    iid_IEditController(iidCtrl);
    iid_FUnknown(iidUnk);
    if (uid_eq(cid, wantProc)) {
      IComponent* p = vlink_create_processor();
      const tresult r = p->queryInterface(iid, obj);
      p->release();
      return r;
    }
    if (uid_eq(cid, wantCtrl)) {
      IEditController* c = vlink_create_controller();
      const tresult r = c->queryInterface(iid, obj);
      c->release();
      return r;
    }
    *obj = nullptr;
    return kResultFalse;
  }

private:
  static constexpr const char* VLINK_VERSION_STR = "0.1.0";
  std::atomic<uint32> refs_{1};
};

extern "C" {

#ifdef _WIN32
__declspec(dllexport)
#endif
IPluginFactory* GetPluginFactory() {
  return new VLinkFactory();
}

#ifdef _WIN32
__declspec(dllexport) bool InitDll() { return true; }
__declspec(dllexport) bool ExitDll() { return true; }
BOOL WINAPI DllMain(HINSTANCE, DWORD, LPVOID) { return TRUE; }
#endif

} // extern "C"
