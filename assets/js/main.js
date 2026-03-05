import { createPfd } from "./pfd.js";
import { createGeoSensor, createOrientationSensor } from "./sensors.js";
import { registerServiceWorker } from "./sw-register.js";
import { $, secure } from "./utils.js";

registerServiceWorker();

let angleEnabled = false;

const pfd = createPfd($("pfd"));
const orientationSensor = createOrientationSensor({
	pfd,
	isAngleEnabled: () => angleEnabled,
});
const geoSensor = createGeoSensor();

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

$("angleBtn").addEventListener("click", async () => {
	if (angleEnabled) {
		setAngleEnabled(false);
		$("env").textContent = "GPS は計測中です。ANGLE は停止中です。";
		return;
	}

	const result = await orientationSensor.start();
	if (result?.ok) {
		setAngleEnabled(true);
		$("env").textContent = "GPS / ANGLE を計測中です（オフライン対応）";
		return;
	}

	setAngleEnabled(false);
	if (result?.status === "denied") {
		$("env").textContent = "ANGLE 権限が拒否されました。ブラウザ設定で許可してください。";
		return;
	}

	if (result?.status === "unsupported") {
		$("env").textContent = "この端末/ブラウザは ANGLE センサーに対応していません。";
		return;
	}

	$("env").textContent = "ANGLE の開始に失敗しました。再度 ANGLE ON を押してください。";
});

$("zeroBtn").addEventListener("click", () => {
	pfd.zero();
});

const bootSensors = async () => {
	if (!secure()) {
		$("env").textContent = "HTTPS で開いてください（または localhost）";
		return;
	}

	$("env").textContent = "GPS は計測中です。ANGLE は ANGLE ON で開始してください。";
	geoSensor.start();
};

bootSensors();
