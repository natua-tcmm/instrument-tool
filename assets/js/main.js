import { createPfd } from "./pfd.js";
import { createGeoSensor, createOrientationSensor } from "./sensors.js";
import { registerServiceWorker } from "./sw-register.js";
import { $, secure } from "./utils.js";

registerServiceWorker();

const pfd = createPfd($("pfd"));
const orientationSensor = createOrientationSensor({ pfd });
const geoSensor = createGeoSensor();

$("zeroBtn").addEventListener("click", () => {
	pfd.zero();
});

$("startBtn").addEventListener("click", async () => {
	if (!secure()) {
		alert("HTTPS で開いてください（または localhost）。");
		return;
	}

	$("startBtn").disabled = true;
	$("env").textContent = "計測中です（オフライン対応）";

	await orientationSensor.start();
	geoSensor.start();
});

if (!secure()) {
	$("env").textContent = "HTTPS で開いてください（または localhost）";
}
