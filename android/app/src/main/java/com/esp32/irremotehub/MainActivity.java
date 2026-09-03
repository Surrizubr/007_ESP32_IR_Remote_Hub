package com.esp32.irremotehub;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WifiScannerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
