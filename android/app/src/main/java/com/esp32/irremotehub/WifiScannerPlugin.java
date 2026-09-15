package com.esp32.irremotehub;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.wifi.ScanResult;
import android.net.wifi.WifiManager;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.List;

@CapacitorPlugin(
    name = "WifiScanner",
    permissions = {
        @Permission(strings = {Manifest.permission.ACCESS_FINE_LOCATION}, alias = "location"),
        @Permission(strings = {Manifest.permission.ACCESS_WIFI_STATE}, alias = "wifiState")
    }
)
public class WifiScannerPlugin extends Plugin {

    @PluginMethod
    public void scanNetworks(PluginCall call) {
        // Solicita permissão de localização em runtime (necessário no Android 6+)
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("location", call, "locationPermissionCallback");
            return;
        }
        doScan(call);
    }

    @PermissionCallback
    private void locationPermissionCallback(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED) {
            doScan(call);
        } else {
            call.reject("Permissão de localização negada. Necessária para escanear redes Wi-Fi.");
        }
    }

    private void doScan(PluginCall call) {
        try {
            Context context = getContext();
            if (context == null) {
                call.reject("Contexto Android indisponível");
                return;
            }
            WifiManager wifiManager = (WifiManager) context.getApplicationContext()
                    .getSystemService(Context.WIFI_SERVICE);
            if (wifiManager == null) {
                call.reject("WifiManager indisponível no dispositivo");
                return;
            }

            // Dispara um novo scan e aguarda os resultados
            wifiManager.startScan();

            List<ScanResult> results = wifiManager.getScanResults();
            JSArray networks = new JSArray();
            if (results != null) {
                for (ScanResult result : results) {
                    if (result.SSID != null && !result.SSID.trim().isEmpty()) {
                        JSObject net = new JSObject();
                        net.put("ssid", result.SSID);
                        net.put("rssi", result.level);
                        boolean secured = result.capabilities != null && (
                            result.capabilities.contains("WPA") ||
                            result.capabilities.contains("WEP") ||
                            result.capabilities.contains("PSK") ||
                            result.capabilities.contains("EAP")
                        );
                        net.put("secured", secured);
                        net.put("channel", getChannelFromFrequency(result.frequency));
                        networks.put(net);
                    }
                }
            }

            JSObject response = new JSObject();
            response.put("networks", networks);
            response.put("count", networks.length());
            call.resolve(response);
        } catch (Exception e) {
            call.reject("Erro ao escanear redes Wi-Fi: " + e.getMessage());
        }
    }

    private int getChannelFromFrequency(int freq) {
        if (freq >= 2412 && freq <= 2484) {
            return (freq - 2412) / 5 + 1;
        } else if (freq >= 5170 && freq <= 5825) {
            return (freq - 5170) / 5 + 34;
        }
        return 1;
    }
}
