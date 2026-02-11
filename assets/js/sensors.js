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

export function createOrientationSensor({ pfd }) {
	const start = async () => {
		if (!window.DeviceOrientationEvent) {
			return;
		}

		try {
			if (typeof DeviceOrientationEvent.requestPermission === "function") {
				const permission = await DeviceOrientationEvent.requestPermission();
				if (permission !== "granted") {
					return;
				}
			}
		} catch (error) {
			// iOS 以外では requestPermission が存在しないことがある
		}

		window.addEventListener(
			"deviceorientation",
			(event) => {
				const normalized = pfd.normalize(event.beta ?? 0, event.gamma ?? 0);
				pfd.setAngles(normalized.beta, normalized.gamma);
				$("angPitch").textContent = fmt(normalized.beta, 1);
				$("angRoll").textContent = fmt(normalized.gamma, 1);
			},
			true,
		);

		$("zeroBtn").disabled = false;
	};

	return { start };
}

export function createGeoSensor() {
	let lastLL = null;
	let lastAlt = null;
	let lastTime = null;
	let emaVspd = null;
	const VSPD_ALPHA = 0.25;

	const start = () => {
		if (!("geolocation" in navigator)) {
			return;
		}

		const options = { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 };
		navigator.geolocation.watchPosition(onGeo, () => {}, options);
	};

	const onGeo = (position) => {
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
		let verticalSpeed = NaN;
		if (Number.isFinite(altitude)) {
			if (lastAlt != null && lastTime != null) {
				const dt = (position.timestamp - lastTime) / 1000;
				if (dt > 0) {
					const raw = (altitude - lastAlt) / dt;
					emaVspd =
						emaVspd == null
							? raw
							: VSPD_ALPHA * raw + (1 - VSPD_ALPHA) * emaVspd;
					verticalSpeed = emaVspd;
				}
			}
			lastAlt = altitude;
			lastTime = position.timestamp;
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
			? `${sign}${fmt(Math.abs(verticalSpeed) * M_TO_FT, 1)}`
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
