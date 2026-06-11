import { useEffect, useState } from 'react';

export function useBatteryStatus() {
  const [battery, setBattery] = useState({
    supported: false,
    level: null,
    charging: null,
  });

  useEffect(() => {
    let batteryManager;

    async function connectBattery() {
      if (!navigator.getBattery) {
        return;
      }

      batteryManager = await navigator.getBattery();

      const updateBattery = () => {
        setBattery({
          supported: true,
          level: Math.round(batteryManager.level * 100),
          charging: batteryManager.charging,
        });
      };

      updateBattery();
      batteryManager.addEventListener('levelchange', updateBattery);
      batteryManager.addEventListener('chargingchange', updateBattery);
    }

    connectBattery().catch(() => {
      setBattery({ supported: false, level: null, charging: null });
    });

    return () => {
      if (!batteryManager) return;
      batteryManager.onlevelchange = null;
      batteryManager.onchargingchange = null;
    };
  }, []);

  return battery;
}
