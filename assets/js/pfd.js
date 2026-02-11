export function createPfd(canvas) {
    const ctx = canvas.getContext('2d', { alpha: false });
    let beta = 0;
    let gamma = 0;
    let beta0 = 0;
    let gamma0 = 0;

    const draw = () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        ctx.clearRect(0, 0, w, h);

        const pitchPxPerDeg = h / 120;
        const y = h / 2 + beta * pitchPxPerDeg;
        const roll = gamma * Math.PI / 180;

        ctx.save();
        ctx.translate(w / 2, y);
        ctx.rotate(roll);

        // 空
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--sky').trim();
        ctx.fillRect(-w, -h, w * 2, h);
        // 地面
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ground').trim();
        ctx.fillRect(-w, 0, w * 2, h);
        // 水平線
        ctx.fillStyle = '#000';
        ctx.fillRect(-w, -1, w * 2, 2);

        ctx.restore();
    };

    const resize = () => {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
    };

    const setAngles = (nextBeta, nextGamma) => {
        beta = nextBeta;
        gamma = nextGamma;
        draw();
    };

    const zero = () => {
        beta0 += beta;
        gamma0 += gamma;
    };

    const normalize = (rawBeta = 0, rawGamma = 0) => ({
        beta: rawBeta - beta0,
        gamma: rawGamma - gamma0
    });

    window.addEventListener('resize', resize, { passive: true });
    resize();

    return {
        setAngles,
        zero,
        normalize
    };
}
