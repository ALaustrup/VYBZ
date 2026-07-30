package cloud.vybz.app;

import android.app.Activity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.UpdateAvailability;

/**
 * Google Play In-App Updates — flexible mode for beta track (Phase 13).
 * No-ops gracefully when Play Core is unavailable (sideload / emulator).
 */
@CapacitorPlugin(name = "VybzAppUpdate")
public class VybzAppUpdatePlugin extends Plugin {
    private static final int REQ_FLEXIBLE = 41301;
    private AppUpdateManager updateManager;

    private AppUpdateManager manager() {
        if (updateManager == null) {
            updateManager = AppUpdateManagerFactory.create(getContext());
        }
        return updateManager;
    }

    @PluginMethod
    public void getUpdateAvailability(PluginCall call) {
        try {
            manager()
                    .getAppUpdateInfo()
                    .addOnSuccessListener(
                            (AppUpdateInfo info) -> {
                                JSObject ret = new JSObject();
                                ret.put("updateAvailability", info.updateAvailability());
                                ret.put(
                                        "availableVersionCode",
                                        info.availableVersionCode());
                                ret.put(
                                        "isFlexibleAllowed",
                                        info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE));
                                ret.put("track", "beta");
                                call.resolve(ret);
                            })
                    .addOnFailureListener(
                            (Exception e) -> {
                                JSObject ret = new JSObject();
                                ret.put("updateAvailability", UpdateAvailability.UNKNOWN);
                                ret.put("availableVersionCode", 0);
                                ret.put("isFlexibleAllowed", false);
                                ret.put("track", "beta");
                                ret.put("error", e.getMessage());
                                call.resolve(ret);
                            });
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("updateAvailability", UpdateAvailability.UNKNOWN);
            ret.put("availableVersionCode", 0);
            ret.put("isFlexibleAllowed", false);
            ret.put("track", "beta");
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void startFlexibleUpdate(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("no activity");
            return;
        }
        try {
            manager()
                    .getAppUpdateInfo()
                    .addOnSuccessListener(
                            (AppUpdateInfo info) -> {
                                if (info.updateAvailability()
                                                != UpdateAvailability.UPDATE_AVAILABLE
                                        || !info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)) {
                                    JSObject ret = new JSObject();
                                    ret.put("started", false);
                                    ret.put("reason", "not_available");
                                    call.resolve(ret);
                                    return;
                                }
                                try {
                                    manager()
                                            .startUpdateFlowForResult(
                                                    info,
                                                    activity,
                                                    AppUpdateOptions.newBuilder(
                                                                    AppUpdateType.FLEXIBLE)
                                                            .build(),
                                                    REQ_FLEXIBLE);
                                    JSObject ret = new JSObject();
                                    ret.put("started", true);
                                    ret.put("mode", "flexible");
                                    call.resolve(ret);
                                } catch (Exception e) {
                                    call.reject("startFlexibleUpdate failed", e);
                                }
                            })
                    .addOnFailureListener((Exception e) -> call.reject("update info failed", e));
        } catch (Exception e) {
            call.reject("startFlexibleUpdate failed", e);
        }
    }

    @PluginMethod
    public void completeFlexibleUpdate(PluginCall call) {
        try {
            manager().completeUpdate();
            call.resolve();
        } catch (Exception e) {
            call.reject("completeFlexibleUpdate failed", e);
        }
    }
}
