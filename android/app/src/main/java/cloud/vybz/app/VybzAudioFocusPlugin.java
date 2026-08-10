package cloud.vybz.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * M9 — Android AudioManager focus for dry HTMLAudioElement playback.
 * Emits focusChange events; does not apply DSP. Ducking is not implemented —
 * transient loss pauses via the JS binder (disclosed).
 */
@CapacitorPlugin(name = "VybzAudioFocus")
public class VybzAudioFocusPlugin extends Plugin {
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private boolean holding = false;

    private final AudioManager.OnAudioFocusChangeListener focusListener =
            (int change) -> {
                JSObject ret = new JSObject();
                ret.put("change", mapChange(change));
                ret.put("code", change);
                notifyListeners("focusChange", ret);
            };

    private AudioManager manager() {
        if (audioManager == null) {
            audioManager =
                    (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        }
        return audioManager;
    }

    private static String mapChange(int change) {
        switch (change) {
            case AudioManager.AUDIOFOCUS_GAIN:
                return "gain";
            case AudioManager.AUDIOFOCUS_LOSS:
                return "loss";
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                return "lossTransient";
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                return "lossTransientCanDuck";
            default:
                return "unknown";
        }
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", manager() != null);
        ret.put("platform", "android");
        call.resolve(ret);
    }

    @PluginMethod
    public void request(PluginCall call) {
        AudioManager am = manager();
        if (am == null) {
            call.reject("AudioManager unavailable");
            return;
        }
        int result;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (focusRequest == null) {
                AudioAttributes attrs =
                        new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_MEDIA)
                                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                                .build();
                focusRequest =
                        new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                                .setAudioAttributes(attrs)
                                .setOnAudioFocusChangeListener(focusListener)
                                .setAcceptsDelayedFocusGain(true)
                                .build();
            }
            result = am.requestAudioFocus(focusRequest);
        } else {
            result =
                    am.requestAudioFocus(
                            focusListener,
                            AudioManager.STREAM_MUSIC,
                            AudioManager.AUDIOFOCUS_GAIN);
        }
        holding = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        JSObject ret = new JSObject();
        ret.put("granted", holding);
        ret.put("result", result);
        call.resolve(ret);
    }

    @PluginMethod
    public void abandon(PluginCall call) {
        AudioManager am = manager();
        if (am == null) {
            call.resolve();
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && focusRequest != null) {
            am.abandonAudioFocusRequest(focusRequest);
        } else {
            am.abandonAudioFocus(focusListener);
        }
        holding = false;
        call.resolve();
    }
}
