package cloud.vybz.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(VybzSecureStorePlugin.class);
        registerPlugin(VybzAppUpdatePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
