import { $, fmt, M_TO_FT, MS_TO_KMH, MS_TO_KTS } from "./utils.js";

function haversine(lat1, lon1, lat2, lon2) {
	const R = 6371000;
	const toRad = (d) => (d * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(a));
}

export function createOrientationSensor({ pfd, isAngleEnabled }) {
	let started = false;
	let permissionGranted = false;

	const start = async () => {
		if (!window.DeviceOrientationEvent) {
			return { ok: false, status: "unsupported" };
		}

		try {
			if (
				typeof DeviceOrientationEvent.requestPermission === "function" &&
				!permissionGranted
			) {
				const permission = await DeviceOrientationEvent.requestPermission();
				if (permission !== "granted") {
					return { ok: false, status: "denied" };
				}
				permissionGranted = true;
			} else {
				permissionGranted = true;
			}
		} catch (error) {
			return { ok: false, status: "error", error };
		}

		if (!started) {
			window.addEventListener(
				"deviceorientation",
				(event) => {
					const normalized = pfd.normalize(event.beta ?? 0, event.gamma ?? 0);
					if (!isAngleEnabled()) {
						return;
					}

					pfd.setAngles(normalized.beta, normalized.gamma);
					$("angPitch").textContent = fmt(normalized.beta, 1);
					$("angRoll").textContent = fmt(normalized.gamma, 1);
				},
				true,
			);
			started = true;
		}

		$("zeroBtn").disabled = false;
		return { ok: true, status: "granted" };
	};

	return { start };
}

export function createGeoSensor({ onFirstFix, onError, onUnsupported } = {}) {
	let lastLL = null;
	let lastAlt = null;
	let lastTime = null;
	let emaVspd = null;
	let stableVspdSamples = 0;
	let fixed = false;
	const VSPD_ALPHA = 0.25;
	const MIN_VSPD_DT = 1;
	const MAX_ALTITUDE_ACCURACY = 50;
	const MAX_RAW_VSPD = 100;
	const REQUIRED_VSPD_SAMPLES = 2;

	const resetVspd = () => {
		lastAlt = null;
		lastTime = null;
		emaVspd = null;
		stableVspdSamples = 0;
	};

	const start = () => {
		if (!("geolocation" in navigator)) {
			onUnsupported?.();
			return { ok: false, status: "unsupported" };
		}

		const options = { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 };
		navigator.geolocation.watchPosition(onGeo, onGeoError, options);
		return { ok: true, status: "watching" };
	};

	const onGeoError = (error) => {
		const status = error?.code === 1 ? "denied" : "error";
		onError?.({ status, error });
	};

	const onGeo = (position) => {
		if (!fixed) {
			fixed = true;
			onFirstFix?.(position);
		}

		const c = position.coords;

		// 速度（未提供なら前回位置から推定）
		let speed = Number.isFinite(c.speed) ? c.speed : null;
		if (speed == null && lastLL) {
			const dt = (position.timestamp - lastLL.t) / 1000;
			if (dt > 0) {
				const d = haversine(lastLL.lat, lastLL.lon, c.latitude, c.longitude);
				speed = d / dt;
			}
		}
		lastLL = { lat: c.latitude, lon: c.longitude, t: position.timestamp };

		// 高度と昇降率
		const altitude = Number.isFinite(c.altitude) ? c.altitude : NaN;
		const altitudeAccuracy = Number.isFinite(c.altitudeAccuracy)
			? c.altitudeAccuracy
			: NaN;
		let verticalSpeed = NaN;
		if (Number.isFinite(altitude)) {
			const altitudeReliable =
				!Number.isFinite(altitudeAccuracy) || altitudeAccuracy <= MAX_ALTITUDE_ACCURACY;

			if (!altitudeReliable) {
				resetVspd();
			} else if (lastAlt != null && lastTime != null) {
				const dt = (position.timestamp - lastTime) / 1000;
				if (dt >= MIN_VSPD_DT) {
					const raw = (altitude - lastAlt) / dt;
					if (Math.abs(raw) <= MAX_RAW_VSPD) {
						emaVspd =
							emaVspd == null
								? raw
								: VSPD_ALPHA * raw + (1 - VSPD_ALPHA) * emaVspd;
						stableVspdSamples += 1;
						if (stableVspdSamples >= REQUIRED_VSPD_SAMPLES) {
							verticalSpeed = emaVspd;
						}
					} else {
						emaVspd = null;
						stableVspdSamples = 0;
					}
				}

				lastAlt = altitude;
				lastTime = position.timestamp;
			} else {
				lastAlt = altitude;
				lastTime = position.timestamp;
			}
		} else {
			resetVspd();
		}

		// 方位
		const heading = Number.isFinite(c.heading) ? c.heading : NaN;

		// 表示
		$("spdKts").textContent = Number.isFinite(speed)
			? fmt(speed * MS_TO_KTS, 0)
			: "—";
		$("spdKmh").textContent = Number.isFinite(speed)
			? fmt(speed * MS_TO_KMH, 0)
			: "—";

		$("altFt").textContent = Number.isFinite(altitude)
			? fmt(altitude * M_TO_FT, 0)
			: "—";
		$("altM").textContent = Number.isFinite(altitude) ? fmt(altitude, 0) : "—";

		const sign = Number.isFinite(verticalSpeed)
			? verticalSpeed >= 0
				? "+"
				: "−"
			: "";
		$("vspdFts").textContent = Number.isFinite(verticalSpeed)
			? `${sign}${fmt(Math.abs(verticalSpeed) * M_TO_FT * 60, 0)}`
			: "—";
		$("vspdMs").textContent = Number.isFinite(verticalSpeed)
			? `${sign}${fmt(Math.abs(verticalSpeed), 2)}`
			: "—";

		$("hdg").textContent = Number.isFinite(heading)
			? String(Math.round(heading) % 360)
			: "—";
	};

	return { start };
}
