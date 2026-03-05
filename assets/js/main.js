import { createPfd } from "./pfd.js";
import { createGeoSensor, createOrientationSensor } from "./sensors.js";
import { registerServiceWorker } from "./sw-register.js";
import { $, secure } from "./utils.js";

registerServiceWorker();

let angleEnabled = false;
const appState = {
	secure: secure(),
	network: navigator.onLine ? "online" : "offline",
	gps: "idle",
	angle: "off",
};

const gpsLabel = {
	idle: "GPS: 待機中",
	watching: "GPS: 取得待ち",
	fixed: "GPS: 計測中",
	denied: "GPS: 権限拒否",
	unsupported: "GPS: 非対応",
	error: "GPS: 取得エラー",
};

const angleLabel = {
	off: "ANGLE: 停止中（ANGLE ONで開始）",
	on: "ANGLE: 計測中",
	denied: "ANGLE: 権限拒否",
	unsupported: "ANGLE: 非対応",
	error: "ANGLE: 開始失敗",
};

const renderStatus = () => {
	if (!appState.secure) {
		$("env").textContent = "HTTPSで開いてください。";
		return;
	}

	$("env").textContent = [
		gpsLabel[appState.gps] ?? gpsLabel.idle,
		angleLabel[appState.angle] ?? angleLabel.off,
	].join(" / ");
};

const pfd = createPfd($("pfd"));
const orientationSensor = createOrientationSensor({
	pfd,
	isAngleEnabled: () => angleEnabled,
});
const geoSensor = createGeoSensor({
	onFirstFix: () => {
		appState.gps = "fixed";
		renderStatus();
	},
	onError: ({ status }) => {
		appState.gps = status === "denied" ? "denied" : "error";
		renderStatus();
	},
	onUnsupported: () => {
		appState.gps = "unsupported";
		renderStatus();
	},
});

const setAngleEnabled = (enabled) => {
	angleEnabled = !!enabled;
	$("angleBtn").textContent = angleEnabled ? "ANGLE OFF" : "ANGLE ON";
	pfd.setActive(angleEnabled);

	if (!angleEnabled) {
		$("angPitch").textContent = "-";
		$("angRoll").textContent = "-";
	}
};

setAngleEnabled(false);
renderStatus();

window.addEventListener("online", () => {
	appState.network = "online";
	renderStatus();
});

window.addEventListener("offline", () => {
	appState.network = "offline";
	renderStatus();
});

$("angleBtn").addEventListener("click", async () => {
	if (angleEnabled) {
		setAngleEnabled(false);
		appState.angle = "off";
		renderStatus();
		return;
	}

	const result = await orientationSensor.start();
	if (result?.ok) {
		setAngleEnabled(true);
		appState.angle = "on";
		renderStatus();
		return;
	}

	setAngleEnabled(false);
	if (result?.status === "denied") {
		appState.angle = "denied";
		renderStatus();
		return;
	}

	if (result?.status === "unsupported") {
		appState.angle = "unsupported";
		renderStatus();
		return;
	}

	appState.angle = "error";
	renderStatus();
});

$("zeroBtn").addEventListener("click", () => {
	pfd.zero();
});

const bootSensors = async () => {
	appState.secure = secure();
	if (!appState.secure) {
		renderStatus();
		return;
	}

	appState.gps = "watching";
	const geoResult = geoSensor.start();
	if (geoResult?.status === "unsupported") {
		appState.gps = "unsupported";
	}
	renderStatus();
};

bootSensors();
