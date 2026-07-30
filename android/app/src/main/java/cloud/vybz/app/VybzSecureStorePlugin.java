package cloud.vybz.app;

import android.util.Base64;

import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * AES-GCM sealed preferences backed by Android KeyStore (via EncryptedSharedPreferences /
 * MasterKey). Phase 13 Android Beta.
 */
@CapacitorPlugin(name = "VybzSecureStore")
public class VybzSecureStorePlugin extends Plugin {
    private static final String PREFS = "vybz_secure_keystore_v1";

    private android.content.SharedPreferences prefs() throws Exception {
        MasterKey masterKey =
                new MasterKey.Builder(getContext())
                        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                        .build();
        return EncryptedSharedPreferences.create(
                getContext(),
                PREFS,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM);
    }

    @PluginMethod
    public void getItem(PluginCall call) {
        String key = call.getString("key");
        if (key == null || key.isEmpty()) {
            call.reject("key required");
            return;
        }
        try {
            String value = prefs().getString(key, null);
            JSObject ret = new JSObject();
            ret.put("value", value);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("secure get failed", e);
        }
    }

    @PluginMethod
    public void setItem(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value");
        if (key == null || key.isEmpty() || value == null) {
            call.reject("key and value required");
            return;
        }
        try {
            prefs().edit().putString(key, value).apply();
            call.resolve();
        } catch (Exception e) {
            call.reject("secure set failed", e);
        }
    }

    @PluginMethod
    public void removeItem(PluginCall call) {
        String key = call.getString("key");
        if (key == null || key.isEmpty()) {
            call.reject("key required");
            return;
        }
        try {
            prefs().edit().remove(key).apply();
            call.resolve();
        } catch (Exception e) {
            call.reject("secure remove failed", e);
        }
    }

    @PluginMethod
    public void clear(PluginCall call) {
        try {
            prefs().edit().clear().apply();
            call.resolve();
        } catch (Exception e) {
            call.reject("secure clear failed", e);
        }
    }

    /** Debug helper — returns key count only (never values). */
    @PluginMethod
    public void stats(PluginCall call) {
        try {
            Map<String, ?> all = prefs().getAll();
            JSObject ret = new JSObject();
            ret.put("count", all.size());
            ret.put("backend", "AndroidKeyStore+AES-GCM");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("secure stats failed", e);
        }
    }

    @SuppressWarnings("unused")
    private static String b64(byte[] bytes) {
        return Base64.encodeToString(bytes, Base64.NO_WRAP);
    }

    @SuppressWarnings("unused")
    private static byte[] fromUtf8(String s) {
        return s.getBytes(StandardCharsets.UTF_8);
    }
}
