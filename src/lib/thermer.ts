"use client";

const THERMER_SCHEME = "my.bluetoothprint.scheme://";

export function isAndroidBrowser(userAgent = window.navigator.userAgent): boolean {
  return /Android/i.test(userAgent);
}

export function openThermerPrint(path: string): boolean {
  if (!isAndroidBrowser()) return false;

  const responseUrl = new URL(path, window.location.origin).toString();
  window.location.href = `${THERMER_SCHEME}${responseUrl}`;
  return true;
}
