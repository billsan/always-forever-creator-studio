const VERSION = "1.7.4.2";
const MAX_UPLOAD_BYTES = 95 * 1024 * 1024;
function getImageDimensions(buffer, mime) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // PNG
  if (mime === "image/png" && bytes.length >= 24) {
    const width = view.getUint32(16, false);
    const height = view.getUint32(20, false);
    return width && height ? { width, height } : null;
  }

  // JPEG
  if (mime === "image/jpeg" && bytes.length >= 4) {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

    let offset = 2;

    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset++;
        continue;
      }

      const marker = bytes[offset + 1];

      // Standalone markers.
      if (
        marker === 0xd8 ||
        marker === 0xd9 ||
        marker === 0x01 ||
        (marker >= 0xd0 && marker <= 0xd7)
      ) {
        offset += 2;
        continue;
      }

      if (offset + 4 > bytes.length) break;

      const segmentLength = view.getUint16(offset + 2, false);

      if (segmentLength < 2 || offset + 2 + segmentLength > bytes.length) {
        break;
      }

      const isStartOfFrame =
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf);

      if (isStartOfFrame && segmentLength >= 7) {
        const height = view.getUint16(offset + 5, false);
        const width = view.getUint16(offset + 7, false);

        return width && height ? { width, height } : null;
      }

      offset += 2 + segmentLength;
    }

    return null;
  }

  // WebP
  if (
    mime === "image/webp" &&
    bytes.length >= 30 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));

    // VP8X extended WebP
    if (chunk === "VP8X" && bytes.length >= 30) {
      const width =
        1 +
        bytes[24] +
        (bytes[25] << 8) +
        (bytes[26] << 16);

      const height =
        1 +
        bytes[27] +
        (bytes[28] << 8) +
        (bytes[29] << 16);

      return width && height ? { width, height } : null;
    }

    // VP8L lossless WebP
    if (
      chunk === "VP8L" &&
      bytes.length >= 25 &&
      bytes[20] === 0x2f
    ) {
      const b1 = bytes[21];
      const b2 = bytes[22];
      const b3 = bytes[23];
      const b4 = bytes[24];

      const width = 1 + (((b2 & 0x3f) << 8) | b1);
      const height =
        1 +
        (((b4 & 0x0f) << 10) |
          (b3 << 2) |
          ((b2 & 0xc0) >> 6));

      return width && height ? { width, height } : null;
    }

    // VP8 lossy WebP
    if (
      chunk === "VP8 " &&
      bytes.length >= 30 &&
      bytes[23] === 0x9d &&
      bytes[24] === 0x01 &&
      bytes[25] === 0x2a
    ) {
      const width =
        view.getUint16(26, true) & 0x3fff;

      const height =
        view.getUint16(28, true) & 0x3fff;

      return width && height ? { width, height } : null;
    }
  }

  return null;
}

function bytesToBase64(bytes) {
  const data =
    bytes instanceof Uint8Array
      ? bytes
      : new Uint8Array(bytes);

  const chunkSize = 0x8000;
  let binary = "";

  for (let offset = 0; offset < data.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...data.subarray(offset, offset + chunkSize)
    );
  }

  return btoa(binary);
}

async function loadPhoton() {  return import("@cf-wasm/photon/workerd");
}

function framedImageResponse(bytes) {
  return {
    response() {
      return new Response(bytes, {
        headers: {
          "content-type": "image/png"
        }
      });
    }
  };
}

function copyPixelsIntoFrame(
  sourcePixels,
  sourceWidth,
  sourceHeight,
  outputPixels,
  outputWidth,
  offsetX,
  offsetY
) {
  for (let y = 0; y < sourceHeight; y += 1) {
    const sourceStart = y * sourceWidth * 4;
    const sourceEnd = sourceStart + sourceWidth * 4;
    const outputStart =
      ((y + offsetY) * outputWidth + offsetX) * 4;

    outputPixels.set(
      sourcePixels.subarray(sourceStart, sourceEnd),
      outputStart
    );
  }
}

function applyRoundedAlpha(
  pixels,
  width,
  height,
  radius
) {
  const r = Math.max(
    1,
    Math.min(radius, Math.floor(width / 2), Math.floor(height / 2))
  );

  const corners = [
    { cx: r, cy: r, left: true, top: true },
    { cx: width - r - 1, cy: r, left: false, top: true },
    { cx: r, cy: height - r - 1, left: true, top: false },
    {
      cx: width - r - 1,
      cy: height - r - 1,
      left: false,
      top: false
    }
  ];

  for (const corner of corners) {
    const startX = corner.left ? 0 : width - r;
    const endX = corner.left ? r : width;
    const startY = corner.top ? 0 : height - r;
    const endY = corner.top ? r : height;

    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        const dx = x - corner.cx;
        const dy = y - corner.cy;

        if ((dx * dx) + (dy * dy) > r * r) {
          pixels[(y * width + x) * 4 + 3] = 0;
        }
      }
    }
  }
}

function createDecorativeFramePixels(
  sourcePixels,
  sourceWidth,
  sourceHeight,
  frameStyle
) {
  const padding = 24;
  const outputWidth = sourceWidth + padding * 2;
  const outputHeight = sourceHeight + padding * 2;
  const outputPixels =
    new Uint8Array(outputWidth * outputHeight * 4);

  if (frameStyle === "celebration") {
    const start = [255, 247, 220];
    const end = [234, 213, 160];

    for (let y = 0; y < outputHeight; y += 1) {
      for (let x = 0; x < outputWidth; x += 1) {
        const t =
          (x + y) /
          Math.max(1, outputWidth + outputHeight - 2);

        const index = (y * outputWidth + x) * 4;

        outputPixels[index] =
          Math.round(start[0] + (end[0] - start[0]) * t);
        outputPixels[index + 1] =
          Math.round(start[1] + (end[1] - start[1]) * t);
        outputPixels[index + 2] =
          Math.round(start[2] + (end[2] - start[2]) * t);
        outputPixels[index + 3] = 255;
      }
    }

    const gold = [195, 154, 77];

    for (let y = 0; y < outputHeight; y += 1) {
      for (let x = 0; x < outputWidth; x += 1) {
        const isGoldBorder =
          x < 3 ||
          y < 3 ||
          x >= outputWidth - 3 ||
          y >= outputHeight - 3;

        if (!isGoldBorder) continue;

        const index = (y * outputWidth + x) * 4;
        outputPixels[index] = gold[0];
        outputPixels[index + 1] = gold[1];
        outputPixels[index + 2] = gold[2];
        outputPixels[index + 3] = 255;
      }
    }
  } else if (frameStyle === "softvignette") {
    for (let y = 0; y < outputHeight; y += 1) {
      for (let x = 0; x < outputWidth; x += 1) {
        const index = (y * outputWidth + x) * 4;
        outputPixels[index] = 32;
        outputPixels[index + 1] = 39;
        outputPixels[index + 2] = 34;
        outputPixels[index + 3] = 255;
      }
    }
  } else {
    for (let y = 0; y < outputHeight; y += 1) {
      for (let x = 0; x < outputWidth; x += 1) {
        const index = (y * outputWidth + x) * 4;
        outputPixels[index] = 255;
        outputPixels[index + 1] = 255;
        outputPixels[index + 2] = 255;
        outputPixels[index + 3] = 36;
      }
    }

    for (let y = 0; y < outputHeight; y += 1) {
      for (let x = 0; x < outputWidth; x += 1) {
        const isBorder =
          x < 2 ||
          y < 2 ||
          x >= outputWidth - 2 ||
          y >= outputHeight - 2;

        if (!isBorder) continue;

        const index = (y * outputWidth + x) * 4;
        outputPixels[index] = 255;
        outputPixels[index + 1] = 255;
        outputPixels[index + 2] = 255;
        outputPixels[index + 3] = 204;
      }
    }
  }

  copyPixelsIntoFrame(
    sourcePixels,
    sourceWidth,
    sourceHeight,
    outputPixels,
    outputWidth,
    padding,
    padding
  );

  if (frameStyle === "softvignette") {
    applyRoundedAlpha(
      outputPixels,
      outputWidth,
      outputHeight,
      18
    );
  }

  if (frameStyle === "soft") {
    applyRoundedAlpha(
      outputPixels,
      outputWidth,
      outputHeight,
      20
    );
  }

  return {
    pixels: outputPixels,
    width: outputWidth,
    height: outputHeight
  };
}

async function createFramedImage(
  env,
  sourceObject,
  frameStyle = "classic"
) {
  if (!env.IMAGES) {
    throw Object.assign(
      new Error("Cloudflare Images is not configured."),
      { status: 503 }
    );
  }

  if (!sourceObject) {
    throw Object.assign(
      new Error("The source photo could not be loaded."),
      { status: 404 }
    );
  }

  const decorativeStyles = new Set([
    "celebration",
    "softvignette",
    "soft"
  ]);

  if (decorativeStyles.has(frameStyle)) {
    const {
      PhotonImage,
      SamplingFilter,
      resize,
      apply_vignette
    } = await loadPhoton();

    const sourceBytes = new Uint8Array(
      await new Response(sourceObject.body).arrayBuffer()
    );

    let sourceImage =
      PhotonImage.new_from_byteslice(sourceBytes);

    let workingImage = sourceImage;

    try {
      const originalWidth = sourceImage.get_width();
      const originalHeight = sourceImage.get_height();
      const maxDimension = Math.max(
        originalWidth,
        originalHeight
      );

      if (maxDimension > 2400) {
        const scale = 2400 / maxDimension;

        const resizedWidth = Math.max(
          1,
          Math.round(originalWidth * scale)
        );

        const resizedHeight = Math.max(
          1,
          Math.round(originalHeight * scale)
        );

        workingImage = resize(
          sourceImage,
          resizedWidth,
          resizedHeight,
          SamplingFilter.Lanczos3
        );
      }

      const sourceWidth = workingImage.get_width();
      const sourceHeight = workingImage.get_height();
      const sourcePixels = workingImage.get_raw_pixels();

      const framed = createDecorativeFramePixels(
        sourcePixels,
        sourceWidth,
        sourceHeight,
        frameStyle
      );

      let outputImage = new PhotonImage(
        framed.pixels,
        framed.width,
        framed.height
      );

      try {
        if (frameStyle === "softvignette") {
          apply_vignette(
            outputImage,
            0.55,
            0.82,
            0.65
          );
        }

        const outputBytes = outputImage.get_bytes();

        return framedImageResponse(outputBytes);
      } finally {
        outputImage.free();
      }
    } finally {
      if (workingImage !== sourceImage) {
        workingImage.free();
      }

      sourceImage.free();
    }
  }

  const frame = {
    classic: {
      color: "#ffffff",
      top: 24,
      right: 24,
      bottom: 24,
      left: 24
    },

    blackborder: {
      color: "#111111",
      top: 24,
      right: 24,
      bottom: 24,
      left: 24
    },

    gold: {
      color: "#c9a227",
      top: 24,
      right: 24,
      bottom: 24,
      left: 24
    },

    sagecream: {
      color: "#f4efe3",
      top: 29,
      right: 29,
      bottom: 29,
      left: 29
    },

    polaroid: {
      color: "#ffffff",
      top: 24,
      right: 24,
      bottom: 72,
      left: 24
    },

    weddingivory: {
      color: "#fffaf0",
      top: 27,
      right: 27,
      bottom: 27,
      left: 27
    },

    memorialdusk: {
      color: "#26342f",
      top: 26,
      right: 26,
      bottom: 26,
      left: 26
    }
  }[frameStyle] || {
    color: "#ffffff",
    top: 24,
    right: 24,
    bottom: 24,
    left: 24
  };

  const input = env.IMAGES.input(sourceObject.body);

  const transformed = input.transform({
    border: {
      color: frame.color,
      top: frame.top,
      right: frame.right,
      bottom: frame.bottom,
      left: frame.left
    }
  });

  return transformed.output({
    format: "image/png"
  });
}

async function createHeavenlyLightJpeg(
  env,
  sourceObject,
  maxDimension = 1080,
  quality = 82
) {
  if (!env.IMAGES) {
    throw Object.assign(
      new Error(
        "Cloudflare Images is unavailable for Heavenly Light rendering."
      ),
      { status: 503 }
    );
  }

  const input = env.IMAGES.input(sourceObject.body);

  const transformed = input.transform({
    width: maxDimension,
    height: maxDimension,
    fit: "scale-down"
  });

  const output = await transformed.output({
  format: "image/jpeg",
  quality
});

  const response = output.response();

  if (!response.ok) {
    throw Object.assign(
      new Error(
        "The Heavenly Light photo could not be optimized for rendering."
      ),
      { status: 502 }
    );
  }

  return new Uint8Array(
    await response.arrayBuffer()
  );
}
async function ensureFramedRenderAsset(
  env,
  owner,
  projectId,
  asset,
  frameStyle
) {
  const frameVersions = {
  classic: "v2-white-24",
  blackborder: "v2-black-24",
  gold: "v2-gold-24",
  sagecream: "v2-sagecream-29",
  polaroid: "v2-polaroid-24-24-72-24",
  weddingivory: "v2-weddingivory-27",
  memorialdusk: "v2-memorialdusk-26",
  celebration: "v3-celebration-gradient-gold",
  softvignette: "v3-softvignette-rounded",
  soft: "v3-soft-rounded-alpha"
};

  const frameVersion =
    frameVersions[frameStyle] || `v2-${safe(frameStyle)}`;

  const styleKey = safe(
    `${frameStyle}-${frameVersion}`
  );

  const stored =
    `render-frame-${asset.id}-${styleKey}.png`;

  const outputKey =
    `${owner}/${projectId}/${stored}`;

  const existing = await env.MEDIA.head(outputKey);

  if (existing) {
    return stored;
  }

  const sourceKey =
    `${owner}/${projectId}/${asset.stored}`;

  const sourceObject = await env.MEDIA.get(sourceKey);

  if (!sourceObject) {
    throw Object.assign(
      new Error("The source photo could not be loaded for rendering."),
      { status: 404 }
    );
  }

  const framed = await createFramedImage(
    env,
    sourceObject,
    frameStyle
  );

  await env.MEDIA.put(outputKey, framed.response().body, {
    httpMetadata: {
      contentType: "image/png"
    },
    customMetadata: {
      owner,
      projectId,
      sourceAssetId: asset.id,
      operation: "render-frame",
      frameStyle,
      frameVersion
    }
  });

  return stored;
}
const MAX_BACKGROUND_INPUT_BYTES = 22 * 1024 * 1024;
const ALLOWED_MIME = /^(image\/(jpeg|png|webp)|video\/(mp4|webm|quicktime)|audio\/(mpeg|mp4|wav|x-wav))$/;

const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
});

const safe = (value = "item") => String(value).replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120) || "item";
const now = () => new Date().toISOString();

const textEncoder = new TextEncoder();
const base64UrlEncode = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const base64UrlDecode = (value) => {
  const padded = String(value).replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
};

async function signStudioToken(claims, secret) {
  if (!secret) throw Object.assign(new Error("Studio authentication is not configured."), { status: 503 });
  const payloadPart = base64UrlEncode(textEncoder.encode(JSON.stringify(claims)));
  const key = await crypto.subtle.importKey("raw", textEncoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signaturePart = base64UrlEncode(await crypto.subtle.sign("HMAC", key, textEncoder.encode(payloadPart)));
  return `${payloadPart}.${signaturePart}`;
}

async function verifyStudioToken(token, secret) {
  if (!secret || !token || !token.includes(".")) return null;
  const [payloadPart, signaturePart] = token.split(".");
  try {
    const key = await crypto.subtle.importKey("raw", textEncoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key, base64UrlDecode(signaturePart), textEncoder.encode(payloadPart));
    if (!valid) return null;
    const claims = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadPart)));
    if (claims.iss !== "alwaysandforever.life" || Number(claims.exp || 0) < Math.floor(Date.now() / 1000)) return null;
    if (!claims.sub || !["customer", "administrator"].includes(claims.role)) return null;
    return claims;
  } catch { return null; }
}

async function hmacValue(value, secret) {
  const key = await crypto.subtle.importKey("raw", textEncoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64UrlEncode(await crypto.subtle.sign("HMAC", key, textEncoder.encode(value)));
}

async function signedRenderMediaUrl(requestUrl, env, owner, projectId, stored) {
  const expires = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  const path = `/render-media/${encodeURIComponent(owner)}/${encodeURIComponent(projectId)}/${encodeURIComponent(stored)}`;
  const signature = await hmacValue(`render-media\n${path}\n${expires}`, env.STUDIO_AUTH_SECRET);
  return `${new URL(requestUrl).origin}${path}?expires=${expires}&signature=${encodeURIComponent(signature)}`;
}

async function validRenderMediaSignature(url, env) {
  const expires = Number(url.searchParams.get("expires") || 0);
  if (!expires || expires < Math.floor(Date.now() / 1000) || expires > Math.floor(Date.now() / 1000) + 25 * 60 * 60) return false;
  const expected = await hmacValue(`render-media\n${url.pathname}\n${expires}`, env.STUDIO_AUTH_SECRET);
  return secureEqual(url.searchParams.get("signature"), expected);
}

function cookieValue(request, name) {
  const found = String(request.headers.get("cookie") || "").split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : "";
}

async function studioSession(request, env) {
  const claims = await verifyStudioToken(cookieValue(request, "aaf_studio_session"), env.STUDIO_AUTH_SECRET);
  if (!claims) return null;
  return { owner: claims.role === "administrator" ? "demo-customer" : safe(`wp-${claims.sub}`), role: claims.role, grantId: safe(claims.grant || `admin-${claims.sub}`), package: claims.package || null };
}

function obituaryTestLoginPage(message = "") {
  const notice = message ? `<div class="notice">${String(message).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>` : "";
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Obituary Writer Test Access · Always &amp; Forever</title><style>
  :root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#102019;color:#f7f1e5;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;padding:24px}.card{width:min(560px,100%);background:#172a22;border:1px solid #c7a45f55;border-radius:24px;padding:34px;box-shadow:0 24px 70px #0007}.brand{color:#c7a45f;letter-spacing:.18em;text-transform:uppercase;font-size:.78rem}.mark{color:#c7a45f;font-size:2rem;margin:18px 0 8px}h1{font-family:Georgia,serif;font-size:2.3rem;margin:.1em 0 .35em}p{color:#d8d4ca;line-height:1.65}.notice{margin:18px 0;padding:12px 14px;border:1px solid #d4a95f88;background:#241d12;border-radius:12px;color:#f6dfb0}label{display:block;margin:22px 0 8px;font-weight:700}input{width:100%;padding:14px 15px;border-radius:12px;border:1px solid #7f8f85;background:#0d1813;color:#fff;font-size:1rem}button{width:100%;margin-top:16px;padding:14px 18px;border:0;border-radius:12px;background:#c7a45f;color:#102019;font-weight:800;font-size:1rem;cursor:pointer}.fine{font-size:.84rem;color:#aeb8b2;margin-top:18px}</style></head><body><main class="card"><div class="brand">Always &amp; Forever</div><div class="mark">✦</div><h1>Obituary Writer Test Access</h1><p>This private test login bypasses WooCommerce only for authorized testing. Customer payment rules remain unchanged.</p>${notice}<form method="post" action="/auth/test-obituary" autocomplete="off"><label for="key">Test access key</label><input id="key" name="key" type="password" required autofocus><button type="submit">Open Obituary Writer</button></form><div class="fine">The key is submitted securely in the request body and is not placed in the URL.</div></main></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow", "referrer-policy": "no-referrer" } });
}

async function acceptObituaryTestAccess(request, env) {
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { allow: "POST" } });
  if (!env.OBITUARY_TEST_KEY) return obituaryTestLoginPage("Test access is not configured yet. Run connect-obituary-test-access.cmd once.");
  const form = await request.formData().catch(() => null);
  const supplied = String(form?.get("key") || "");
  if (!await secureEqual(supplied, env.OBITUARY_TEST_KEY)) return obituaryTestLoginPage("That test access key was not accepted.");
  const issued = Math.floor(Date.now() / 1000);
  const token = await signStudioToken({
    iss: "alwaysandforever.life",
    sub: "obituary-test-admin",
    role: "administrator",
    grant: "obituary-test-access",
    package: { kind: "obituary", test: true },
    iat: issued,
    exp: issued + 2 * 60 * 60
  }, env.STUDIO_AUTH_SECRET);
  const headers = new Headers({ location: "/obituary-writer", "cache-control": "no-store", "referrer-policy": "no-referrer" });
  headers.append("set-cookie", `aaf_studio_session=${encodeURIComponent(token)}; Path=/; Max-Age=7200; HttpOnly; Secure; SameSite=Lax`);
  return new Response(null, { status: 303, headers });
}

async function acceptWooAccess(request, env, url) {
  const token = url.searchParams.get("token") || "";
  const claims = await verifyStudioToken(token, env.STUDIO_AUTH_SECRET);
  if (!claims) return new Response("This studio access link is invalid or expired.", { status: 401 });
  if (claims.role === "customer") {
    const limits = claims.package || {};
    await env.DB.prepare(`INSERT INTO studio_grants (id, owner_id, order_id, product_id, photo_limit, song_limit, duration_limit, project_limit, projects_created, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, 'active', ?, ?)
      ON CONFLICT(id) DO UPDATE SET status='active', photo_limit=excluded.photo_limit, song_limit=excluded.song_limit, duration_limit=excluded.duration_limit, updated_at=excluded.updated_at`)
      .bind(safe(claims.grant), safe(`wp-${claims.sub}`), Number(claims.orderId || 0), Number(limits.productId || 0), Number(limits.photos || 0), Number(limits.songs || 0), Number(limits.minutes || 0), now(), now()).run();
  }
  const headers = new Headers({ location: claims.package?.kind === "obituary" ? "/obituary-writer" : "/" });
  headers.append("set-cookie", `aaf_studio_session=${encodeURIComponent(token)}; Path=/; Max-Age=28800; HttpOnly; Secure; SameSite=Lax`);
  return new Response(null, { status: 302, headers });
}

async function secureEqual(left, right) {
  const [a, b] = [String(left || ""), String(right || "")];
  if (!a.length || a.length !== b.length) return false;
  const keyA = await crypto.subtle.importKey("raw", textEncoder.encode(a), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const keyB = await crypto.subtle.importKey("raw", textEncoder.encode(b), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const signature = await crypto.subtle.sign("HMAC", keyA, textEncoder.encode("aaf-secret-check"));
  return crypto.subtle.verify("HMAC", keyB, signature, textEncoder.encode("aaf-secret-check"));
}

async function requireMusicAdmin(request, env) {
  if (!env.MUSIC_ADMIN_KEY) return false;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  return secureEqual(supplied, env.MUSIC_ADMIN_KEY);
}

const parseList = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20);

const OBITUARY_FIELDS = ["name", "nickname", "birthDate", "passingDate", "hometown", "survivingFamily", "precededInDeath", "educationCareer", "militaryService", "hobbiesPassions", "churchCommunity", "personalityTraits", "favoriteMemories", "serviceDetails", "closingMessage", "memories"];
const OBITUARY_TONES = ["Traditional", "Warm & Personal", "Celebration of Life", "Faith-Based", "Short Newspaper Style"];
const OBITUARY_LENGTHS = ["Short", "Standard", "Detailed"];

function cleanOptionalHttpUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString().slice(0, 2048);
  } catch { return ""; }
}

function cleanObituaryInput(value = {}) {
  const source = value.details && typeof value.details === "object" ? value.details : value;
  const details = {};
  for (const field of OBITUARY_FIELDS) details[field] = String(source[field] || "").trim().slice(0, 5000);
  const shareSource = value.share && typeof value.share === "object" ? value.share : {};
  return {
    details,
    tone: OBITUARY_TONES.includes(value.tone) ? value.tone : "Warm & Personal",
    length: OBITUARY_LENGTHS.includes(value.length) ? value.length : "Standard",
    obituary: String(value.obituary || "").trim().slice(0, 30000),
    videoScript: String(value.videoScript || "").trim().slice(0, 10000),
    share: {
      enabled: shareSource.enabled === true,
      token: String(shareSource.token || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 160),
      livestreamUrl: cleanOptionalHttpUrl(shareSource.livestreamUrl),
      updatedAt: String(shareSource.updatedAt || "").slice(0, 80)
    }
  };
}

async function openAIText(env, instructions, input, maxOutputTokens = 1800) {
  if (!env.OPENAI_API_KEY) throw Object.assign(new Error("AI writing is not connected yet. Add the OPENAI_API_KEY Cloudflare secret."), { status: 503 });
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: env.OPENAI_MODEL || "gpt-5.4-mini", instructions, input, max_output_tokens: maxOutputTokens, store: false })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error(JSON.stringify({ message: "OpenAI request failed", providerStatus: response.status, providerCode: data.error?.code || "unknown" }));
    throw Object.assign(new Error(data.error?.message || "The AI writer could not complete this request."), { status: 502 });
  }
  const output = String(data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text || "").trim();
  if (!output) throw Object.assign(new Error("The AI writer returned an empty response. Please try again."), { status: 502 });
  return output;
}

async function listSafeMusic(env, includeInactive = false) {
  const where = includeInactive ? "" : "WHERE status = 'active'";
  const result = await env.DB.prepare(`SELECT id, title, artist, mood, occasions_json, duration_seconds, provider, license_reference, license_version, platforms_json, content_id_policy, status, stored, mime, bytes, created_at, updated_at FROM safe_music_tracks ${where} ORDER BY title`).all();
  return result.results.map((row) => ({
    ...row,
    occasions: JSON.parse(row.occasions_json || "[]"),
    platforms: JSON.parse(row.platforms_json || "[]"),
    url: row.status === "active" ? `/safe-music/${encodeURIComponent(row.id)}` : ""
  }));
}

function assetUses(project, assetId) {
  const uses = [];
  for (const item of project.timeline || []) {
    if (item.assetId === assetId) uses.push(`timeline item ${item.id}`);
    if ((item.slots || []).includes(assetId)) uses.push(`collage ${item.id}`);
    if (item.motionBackground?.assetId === assetId || item.motionBackground?.id === assetId) uses.push(`motion background ${item.id}`);
  }
  return uses;
}

const TEMPLATES = [
  { id: "gentle-light", name: "Gentle Light", category: "memorial", summary: "Soft illumination, quiet fades, and space for a loving life story.", colors: ["#16231e", "#769184", "#d5bd86"], background: "linear-gradient(135deg,#16231e,#769184)", transition: "fade", defaultEffect: "gentle-light", titles: ["In Loving Memory", "A Life of Love", "Forever in Our Hearts"] },
  { id: "garden-legacy", name: "Garden Legacy", category: "memorial", summary: "Botanical sage and warm gold for memories that continue to bloom.", colors: ["#2d4438", "#94a78e", "#c7a96b"], background: "linear-gradient(135deg,#2d4438,#94a78e 62%,#c7a96b)", transition: "dissolve", titles: ["A Beautiful Legacy", "The Story We Carry", "Love Grows Forever"] },
  { id: "faithful-journey", name: "Faithful Journey", category: "memorial", summary: "Deep blue-green, gentle light, and reflective faith-centered scenes.", colors: ["#132a2c", "#557d78", "#d8c58e"], background: "linear-gradient(145deg,#132a2c,#557d78)", transition: "fade", titles: ["A Faithful Journey", "Grace Through the Years", "Home in Eternal Peace"] },
  { id: "ivory-promise", name: "Ivory Promise", category: "wedding", summary: "Airy ivory, champagne, and refined typography for a timeless wedding film.", colors: ["#fffaf0", "#d9c4ad", "#8f6b57"], background: "linear-gradient(135deg,#fffaf0,#d9c4ad)", transition: "fade", darkText: true, titles: ["Our Wedding Day", "The Promise", "And So the Adventure Begins"] },
  { id: "garden-romance", name: "Garden Romance", category: "wedding", summary: "Fresh sage florals and sunlit warmth for an outdoor celebration.", colors: ["#405e50", "#a8b79d", "#e1c98f"], background: "linear-gradient(135deg,#405e50,#a8b79d 65%,#e1c98f)", transition: "dissolve", titles: ["A Garden Romance", "Surrounded by Love", "Forever Starts Here"] },
  { id: "golden-vows", name: "Golden Vows", category: "wedding", summary: "Evening elegance with forest green, candlelight, and polished gold.", colors: ["#162821", "#7e6841", "#d8b868"], background: "linear-gradient(145deg,#162821,#7e6841 72%,#d8b868)", transition: "fade", titles: ["Golden Vows", "A Moment in Time", "To Have and to Hold"] },
  { id: "bright-years", name: "Bright Years", category: "birthday", summary: "Cheerful color, energetic movement, and room for every milestone.", colors: ["#397b73", "#e3aa5d", "#f4ddd0"], background: "linear-gradient(135deg,#397b73,#e3aa5d)", transition: "slide", titles: ["Celebrating You", "The Bright Years", "The Best Is Yet to Come"] },
  { id: "milestone-celebration", name: "Milestone Celebration", category: "birthday", summary: "Bold jewel tones and celebratory gold for landmark birthdays.", colors: ["#3e3456", "#a66f78", "#e3bd68"], background: "linear-gradient(135deg,#3e3456,#a66f78 65%,#e3bd68)", transition: "slide", titles: ["A Milestone Worth Celebrating", "Wonderful Memories", "Cheers to the Next Chapter"] },
  { id: "our-golden-story", name: "Our Golden Story", category: "anniversary", summary: "Warm heritage tones for a love story built across the years.", colors: ["#35473e", "#a88a58", "#e1cfaa"], background: "linear-gradient(145deg,#35473e,#a88a58)", transition: "fade", titles: ["Our Golden Story", "A Lifetime Together", "Still Choosing You"] },
  { id: "then-and-now", name: "Then and Now", category: "anniversary", summary: "A graceful past-to-present layout designed for paired memories.", colors: ["#5d665e", "#c7b9a1", "#f4eee2"], background: "linear-gradient(135deg,#5d665e,#c7b9a1)", transition: "dissolve", titles: ["Then & Now", "Through Every Season", "Our Story Continues"] },
  { id: "life-in-color", name: "Life in Color", category: "general", summary: "Lively, adaptable color for graduations, retirements, showers, and more.", colors: ["#3d7169", "#d78e68", "#e5c25f"], background: "linear-gradient(135deg,#3d7169,#d78e68 62%,#e5c25f)", transition: "slide", titles: ["Life in Color", "Moments Worth Keeping", "Celebrate Every Chapter"] },
  { id: "elegant-celebration", name: "Elegant Celebration", category: "general", summary: "Cream, sage, and gold for an understated, versatile occasion film.", colors: ["#425b50", "#b9c3b3", "#d3b36f"], background: "linear-gradient(145deg,#425b50,#b9c3b3 72%,#d3b36f)", transition: "fade", titles: ["A Beautiful Celebration", "Together in This Moment", "With Love and Gratitude"] }
];

const EFFECT_BY_TEMPLATE = {
  "gentle-light": "gentle-light", "garden-legacy": "garden-legacy", "faithful-journey": "faithful-journey",
  "ivory-promise": "ivory-promise", "garden-romance": "garden-romance", "golden-vows": "golden-vows",
  "bright-years": "bright-years", "milestone-celebration": "milestone-celebration",
  "our-golden-story": "our-golden-story", "then-and-now": "then-and-now",
  "life-in-color": "life-in-color", "elegant-celebration": "elegant-celebration"
};

function publicTemplate(template) {
  return { ...template, effectPack: EFFECT_BY_TEMPLATE[template.id], sceneCount: 7, aspectRatios: ["16:9", "9:16", "1:1", "4:5"] };
}

function applyTemplate(project, template) {
  const scene = (type, text, duration, role) => ({
    id: crypto.randomUUID(), type, text, label: text, duration, start: 0,
    transition: template.transition, caption: "", role, effect: { pack: "none", intensity: "none" }, motionBackground: { type: "none" },
    style: { colors: template.colors, darkText: Boolean(template.darkText) }
  });
  project.templateId = template.id;
  project.occasion = template.category === "general" ? "celebration" : template.category;
  project.canvas = { background: template.background };
  project.effects = { pack: "none", intensity: "none" };
  project.settings = { transition: template.transition, photoDuration: 5, musicVolume: 0.32, palette: template.colors };
  project.timeline = [
    scene("text", template.titles[0], 5, "opening"),
    scene("placeholder", "Add opening photo", 5, "photo"),
    scene("placeholder", "Add featured memory", 5, "photo"),
    scene("text", template.titles[1], 4, "section"),
    scene("placeholder", "Add story photo", 5, "photo"),
    scene("placeholder", "Add closing photo", 5, "photo"),
    scene("text", template.titles[2], 5, "closing")
  ];
  const signatureEffect = { pack: EFFECT_BY_TEMPLATE[template.id], intensity: "subtle" };
  project.timeline[0].effect = signatureEffect;
  project.timeline[project.timeline.length - 1].effect = { ...signatureEffect };
  return project;
}

function projectTemplate(owner, title = "My Story") {
  const timestamp = now();
  return {
    id: crypto.randomUUID(), ownerId: owner, title, occasion: "memorial", aspectRatio: "16:9",
    resolution: "1080p", createdAt: timestamp, updatedAt: timestamp, duration: 0,
    canvas: { background: "#18221e" }, assets: [], timeline: [],
    settings: { transition: "fade", photoDuration: 5, musicVolume: 0.32 },
    effects: { pack: "none", intensity: "none" }, obituary: cleanObituaryInput(), render: null
  };
}

async function parseJson(request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 12 * 1024 * 1024) throw Object.assign(new Error("Request is too large."), { status: 413 });
  try { return await request.json(); }
  catch { throw Object.assign(new Error("Invalid JSON request."), { status: 400 }); }
}

async function loadProject(env, owner, id) {
  const row = await env.DB.prepare("SELECT project_json FROM projects WHERE id = ? AND owner_id = ?")
    .bind(id, owner).first();
  return row ? JSON.parse(row.project_json) : null;
}

async function loadProjectByGrant(env, owner, grantId) {
  const row = await env.DB.prepare(
    "SELECT project_json FROM projects WHERE owner_id = ? AND json_extract(project_json, '$.entitlement.grantId') = ? ORDER BY updated_at DESC LIMIT 1"
  ).bind(owner, String(grantId)).first();

  return row ? JSON.parse(row.project_json) : null;
}
async function saveProject(env, project) {
project.updatedAt = now();
  await env.DB.prepare(`INSERT INTO projects (id, owner_id, title, occasion, project_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET title=excluded.title, occasion=excluded.occasion,
    project_json=excluded.project_json, updated_at=excluded.updated_at`)
    .bind(project.id, project.ownerId, project.title, project.occasion, JSON.stringify(project), project.createdAt, project.updatedAt)
    .run();
  return project;
}

async function listProjects(env, owner) {
  const result = await env.DB.prepare("SELECT project_json FROM projects WHERE owner_id = ? ORDER BY updated_at DESC")
    .bind(owner).all();
  return result.results.map((row) => JSON.parse(row.project_json));
}

function mediaHeaders(object, request) {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, max-age=3600");
  headers.set("accept-ranges", "bytes");
  const range = request.headers.get("range");
  if (range && object.range) {
    const offset = object.range.offset || 0;
    const length = object.range.length || object.size;
    headers.set("content-range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set("content-length", String(length));
  }
  return headers;
}

async function serveMedia(request, env, owner, projectId, stored) {
  const project = await loadProject(env, owner, projectId);
  if (!project || !project.assets.some((asset) => asset.stored === stored)) return json({ message: "Media not found." }, 404);
  const key = `${owner}/${projectId}/${stored}`;
  const rangeHeader = request.headers.get("range");
  let range;
  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
    if (!match) return new Response(null, { status: 416 });
    if (match[1] && match[2]) range = { offset: Number(match[1]), length: Number(match[2]) - Number(match[1]) + 1 };
    else if (match[1]) range = { offset: Number(match[1]) };
    else if (match[2]) range = { suffix: Number(match[2]) };
  }
  const object = await env.MEDIA.get(key, range ? { range } : undefined);
  if (!object) return json({ message: "Media not found." }, 404);
  return new Response(object.body, { status: rangeHeader ? 206 : 200, headers: mediaHeaders(object, request) });
}

async function serveRenderDerivative(request, env, owner, projectId, stored) {
  if (!String(stored).startsWith("render-frame-")) {
    return json({ message: "Media not found." }, 404);
  }

  const project = await loadProject(env, owner, projectId);
  if (!project) {
    return json({ message: "Media not found." }, 404);
  }

  const key = `${owner}/${projectId}/${stored}`;
  const rangeHeader = request.headers.get("range");
  let range;

  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);

    if (!match) {
      return new Response(null, { status: 416 });
    }

    if (match[1] && match[2]) {
      range = {
        offset: Number(match[1]),
        length: Number(match[2]) - Number(match[1]) + 1
      };
    } else if (match[1]) {
      range = { offset: Number(match[1]) };
    } else if (match[2]) {
      range = { suffix: Number(match[2]) };
    }
  }

  const object = await env.MEDIA.get(
    key,
    range ? { range } : undefined
  );

  if (!object) {
    return json({ message: "Media not found." }, 404);
  }

  return new Response(object.body, {
    status: rangeHeader ? 206 : 200,
    headers: mediaHeaders(object, request)
  });
}

async function serveSafeMusic(request, env, stored) {
  const rangeHeader = request.headers.get("range");
  let range;
  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
    if (!match) return new Response(null, { status: 416 });
    if (match[1] && match[2]) range = { offset: Number(match[1]), length: Number(match[2]) - Number(match[1]) + 1 };
    else if (match[1]) range = { offset: Number(match[1]) };
    else if (match[2]) range = { suffix: Number(match[2]) };
  }
  const object = await env.MEDIA.get(stored, range ? { range } : undefined);
  if (!object) return json({ message: "Track not found." }, 404);
  return new Response(object.body, { status: rangeHeader ? 206 : 200, headers: mediaHeaders(object, request) });
}

const transitionName = (value) => ({ dissolve: "fade", slide: "wipeLeft", fade: "fade" })[value] || "fade";
const shotstackEffect = (item) => {
  const action = String(item.cinematicAction || item.effect?.pack || "");
  if (/zoom-out|pull|reveal/i.test(action)) return "zoomOut";
  if (/slide-left/i.test(action)) return "slideLeft";
  if (/slide-right/i.test(action)) return "slideRight";
  return /none/i.test(action) ? undefined : "zoomIn";
};

function solidBackground(value) {
  const match = String(value || "").match(/#[0-9a-fA-F]{6}/);
  return match ? match[0] : "#18221e";
}

function shotstackPosition(item) {
  const known = { "top-center": "top", "bottom-left": "bottomLeft", "bottom-center": "bottom", center: "center" };
  if (item.position === "custom") return { position: "center", offset: { x: Math.max(-.48, Math.min(.48, Number(item.x || 50) / 100 - .5)), y: Math.max(-.48, Math.min(.48, .5 - Number(item.y || 50) / 100)) } };
  return { position: known[item.position] || "center" };
}

function cloudRevealSvg() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
      <defs>
        <filter id="blur">
          <feGaussianBlur stdDeviation="34"/>
        </filter>
      </defs>

      <g filter="url(#blur)" fill="#ffffff" fill-opacity="0.92">
        <ellipse cx="250" cy="270" rx="360" ry="125"/>
        <ellipse cx="560" cy="235" rx="300" ry="145"/>
        <ellipse cx="930" cy="340" rx="390" ry="155"/>
        <ellipse cx="1320" cy="245" rx="350" ry="135"/>
        <ellipse cx="1690" cy="335" rx="390" ry="160"/>

        <ellipse cx="170" cy="690" rx="390" ry="155"/>
        <ellipse cx="560" cy="760" rx="420" ry="165"/>
        <ellipse cx="1030" cy="675" rx="430" ry="175"/>
        <ellipse cx="1510" cy="750" rx="470" ry="180"/>
      </g>

      <rect width="1920" height="1080" fill="#e7f0f3" fill-opacity="0.34"/>
    </svg>
  `.trim();

  return svg;
}

function cloudRevealClip(start, length) {
  const revealLength = Math.min(3.6, Math.max(0.5, length));

  return {
    asset: {
      type: "svg",
      src: cloudRevealSvg()
    },
    start,
    length: revealLength,
    fit: "cover",
    position: "center",
    opacity: [
      {
        from: 1,
        to: 0,
        start: Math.min(1.2, revealLength * 0.35),
        length: Math.max(0.25, revealLength - Math.min(1.2, revealLength * 0.35)),
        interpolation: "linear"
      }
    ],
    offset: {
      x: [
        {
          from: -0.08,
          to: 0.18,
          start: 0,
          length: revealLength,
          interpolation: "linear"
        }
      ]
    }
  };
}

async function buildShotstackEdit(project, requestUrl, env, aspectRatio = project.aspectRatio || "16:9") {
  const assets = new Map(project.assets.map((asset) => [asset.id, asset]));
  const renderSizes = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "4:5": { width: 1080, height: 1350 },
  "1:1": { width: 1080, height: 1080 }
};

const renderSize = renderSizes[aspectRatio] || renderSizes["16:9"];
  const visualClips = [];
  const revealClips = [];
  const heavenlyLightTracks = [];
  const textClips = [];
  const audioClips = [];

  let cursor = 0;

  for (const item of project.timeline || []) {
    const length = Math.max(0.5, Number(item.duration || 5));

    if (item.type === "audio") {
      const asset = assets.get(item.assetId);

      if (asset) {
        audioClips.push({
          asset: {
            type: "audio",
            src: await signedRenderMediaUrl(
              requestUrl,
              env,
              project.ownerId,
              project.id,
              asset.stored
            ),
            volume: Math.max(
              0,
              Math.min(1, Number(item.volume ?? 0.32))
            )
          },
          start: Math.max(0, Number(item.start || 0)),
          length
        });
      }

      continue;
    }

    if (item.type === "text" && item.overlay) {
      textClips.push({
        asset: {
          type: "rich-text",
          text: String(item.text || " ").slice(0, 1000),
          font: {
            family: "Roboto",
            size: Math.max(
              12,
              Math.min(200, Number(item.fontSize || 42))
            ),
            color: /^#[0-9a-f]{6}$/i.test(item.color || "")
              ? item.color
              : "#ffffff"
          }
        },
        start: Math.max(0, Number(item.start || 0)),
        length,
        transition: {
          in: "fade",
          out: "fade"
        },
        ...shotstackPosition(item)
      });

      continue;
    }

    if (item.type === "text") {
      textClips.push({
        asset: {
          type: "rich-text",
          text: String(item.text || " ").slice(0, 1000),
          font: {
            family: "Roboto",
            size: Math.max(
              12,
              Math.min(200, Number(item.fontSize || 54))
            ),
            color: /^#[0-9a-f]{6}$/i.test(item.color || "")
              ? item.color
              : "#ffffff"
          }
        },
        start: cursor,
        length,
        transition: {
          in: "fade",
          out: "fade"
        },
        position: "center"
      });

      cursor += length;
      continue;
    }

    if (item.type === "collage") {
      const ids = (item.slots || [])
        .filter(Boolean)
        .slice(0, 4);

      for (let index = 0; index < ids.length; index++) {
        const asset = assets.get(ids[index]);

        if (!asset) continue;

        const positions =
          ids.length === 2
            ? ["left", "right"]
            : ["topLeft", "topRight", "bottomLeft", "bottomRight"];

        visualClips.push({
          asset: {
            type: "image",
            src: await signedRenderMediaUrl(
              requestUrl,
              env,
              project.ownerId,
              project.id,
              asset.stored
            )
          },
          start: cursor,
          length,
          fit: "contain",
          scale: ids.length === 2 ? 0.48 : 0.42,
          position: positions[index],
          transition: {
            in: transitionName(item.transition),
            out: transitionName(item.transition)
          }
        });
      }

      cursor += length;
      continue;
    }

    const asset = assets.get(item.assetId);

    if (item.type === "visual" && asset) {
  const frameStyle = String(item.frameStyle || "none");

  const useFramedDerivative =
    asset.kind === "photo" &&
    frameStyle !== "none" &&
    frameStyle !== "backgroundphoto" &&
    item.fit !== "cover";

  const renderStored = useFramedDerivative
    ? await ensureFramedRenderAsset(
        env,
        project.ownerId,
        project.id,
        asset,
        frameStyle
      )
    : asset.stored;

  const sourceUrl = await signedRenderMediaUrl(
    requestUrl,
    env,
    project.ownerId,
    project.id,
    renderStored
  );

    const clip = {
    asset: {
      type: asset.kind === "video" ? "video" : "image",
      src: sourceUrl
    },
    start: cursor,
    length,
    fit: item.fit === "cover" ? "crop" : "contain",
    position: "center",
    transition: {
      in: transitionName(item.transition),
      out: transitionName(item.transition)
    }
  };

  if (asset.kind === "photo") {
    const cinematicAction = String(item.cinematicAction || "none");

    if (
      cinematicAction === "slow-zoom" ||
      cinematicAction === "pan-left" ||
      cinematicAction === "pan-right"
    ) {
      const effect = shotstackEffect(item);

      if (effect) {
        clip.effect = effect;
      }
    }
  }

if (
  asset.kind === "photo" &&
  String(item.cinematicAction || "none") === "heavenly-light"
) {
  const revealLength = Math.min(
    3.2,
    Math.max(0.5, length)
  );

  /*
   * Keep the normal Shotstack image clip.
   * This preserves the same contain/crop and framed-image
   * geometry used by every other final render.
   */
  visualClips.push(clip);

  /*
   * Heavenly Light is now only a reveal overlay.
   * The overlay starts opaque and an expanding transparent
   * circle exposes the correctly sized Shotstack photo below.
   */
  const heavenlyLightHtml = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: transparent;
}

.heavenly-light-cover {
  position: absolute;
  inset: 0;
  background: ${solidBackground(project.canvas?.background)};
  -webkit-mask-image:
    radial-gradient(
      circle at 50% 45%,
      transparent 0%,
      transparent 3%,
      #000 3.5%,
      #000 100%
    );
  mask-image:
    radial-gradient(
      circle at 50% 45%,
      transparent 0%,
      transparent 3%,
      #000 3.5%,
      #000 100%
    );
  animation:
    heavenlyLightReveal ${revealLength}s ease-out forwards;
}

@keyframes heavenlyLightReveal {
  0% {
    -webkit-mask-image:
      radial-gradient(
        circle at 50% 45%,
        transparent 0%,
        transparent 3%,
        #000 3.5%,
        #000 100%
      );
    mask-image:
      radial-gradient(
        circle at 50% 45%,
        transparent 0%,
        transparent 3%,
        #000 3.5%,
        #000 100%
      );
  }

  100% {
    -webkit-mask-image:
      radial-gradient(
        circle at 50% 45%,
        transparent 0%,
        transparent 90%,
        #000 91%,
        #000 100%
      );
    mask-image:
      radial-gradient(
        circle at 50% 45%,
        transparent 0%,
        transparent 90%,
        #000 91%,
        #000 100%
      );
  }
}

</style>
</head>
<body>
<div class="heavenly-light-cover"></div>
</body>
</html>`;

  heavenlyLightTracks.push({
    clips: [
      {
        asset: {
          type: "html5",
          html: heavenlyLightHtml
        },
        start: cursor,
        length: revealLength,
        width: renderSize.width,
        height: renderSize.height,
        position: "center"
      }
    ]
  });
} else {
  visualClips.push(clip);
}
  if (
    asset.kind === "photo" &&
    String(item.cinematicAction || "none") === "cloud-reveal"
  ) {
    revealClips.push(
      cloudRevealClip(cursor, length)
    );
  }
}
cursor += length;
  }

  if (!visualClips.length && !textClips.length) {
    throw Object.assign(
      new Error(
        "Add at least one completed photo, video, or title slide before rendering."
      ),
      { status: 400 }
    );
  }

  const tracks = [
  ...textClips.map((clip) => ({ clips: [clip] })),
  ...revealClips.map((clip) => ({ clips: [clip] })),
  ...heavenlyLightTracks,
  ...visualClips.map((clip) => ({ clips: [clip] })),
  ...audioClips.map((clip) => ({ clips: [clip] }))
];

  return {
    timeline: {
      background: solidBackground(project.canvas?.background),
      tracks
    },
    output: {
      format: "mp4",
      resolution: "hd",
      aspectRatio,
      fps: 25,
      quality: "high",
      destinations: [
        {
          provider: "shotstack",
          exclude: true
        }
      ]
    }
  };
}
function shotstackBase(env) {
  const stage = env.SHOTSTACK_ENVIRONMENT === "v1" ? "v1" : "stage";
  return `https://api.shotstack.io/edit/${stage}`;
}

async function shotstackRequest(env, path, init = {}) {
  const response = await fetch(`${shotstackBase(env)}${path}`, { ...init, headers: { accept: "application/json", "x-api-key": env.SHOTSTACK_API_KEY, ...(init.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error(JSON.stringify({ message: "Shotstack request failed", providerStatus: response.status, providerMessage: data.message || data.response?.error || "unknown" }));
    throw Object.assign(new Error(data.message || data.response?.error || `Shotstack returned ${response.status}.`), { status: 502 });
  }
  return data;
}

async function persistCompletedRender(env, project, providerUrl, format = "master") {
  const provider = await fetch(providerUrl);
  if (!provider.ok || !provider.body) throw Object.assign(new Error(`The rendered video could not be transferred to private storage (${provider.status}).`), { status: 502 });
  const stored = format === "master"
  ? `${project.ownerId}/${project.id}/final/${project.render.id}.mp4`
  : `${project.ownerId}/${project.id}/final/${project.render.id}-${format}.mp4`;
  await env.MEDIA.put(stored, provider.body, { httpMetadata: { contentType: "video/mp4", contentDisposition: `attachment; filename="${safe(project.title)}.mp4"` }, customMetadata: { owner: project.ownerId, projectId: project.id, renderId: project.render.id } });
  if (format === "master") {
  project.render.outputUrl = `/final/${encodeURIComponent(project.id)}/${encodeURIComponent(project.render.id)}.mp4`;
  project.render.stored = stored;
} else {
  project.render.outputs ||= {};
  project.render.outputs[format] = `/final/${encodeURIComponent(project.id)}/${encodeURIComponent(project.render.id)}-${format}.mp4`;

  project.render.storedOutputs ||= {};
  project.render.storedOutputs[format] = stored;
}

project.render.outputs ||= {};

if (format === "master") {
  project.render.outputs.master = project.render.outputUrl;
}

const allFormatsComplete = ["master", "vertical", "portrait", "square"]
  .every((key) => Boolean(project.render.outputs[key]));

project.render.status = allFormatsComplete ? "complete" : "rendering";

if (allFormatsComplete) {
  project.render.completedAt = now();
}

await env.DB.prepare(
  "UPDATE render_jobs SET status=?, output_url=?, updated_at=? WHERE id=?"
)
  .bind(
    project.render.status,
    project.render.outputUrl || null,
    now(),
    project.render.id
  )
  .run();  await saveProject(env, project);
  return project.render;
}

async function refreshRender(env, project) {
    if (
    project.render?.outputUrl &&
    !project.render?.releaseRenderIds
  ) {
    project.render.status = "complete";
    await saveProject(env, project);
    return project.render;
  }
  if (!project.render || project.render.status === "failed" || !project.render.providerRenderId) return project.render;
  const data = await shotstackRequest(env, `/render/${encodeURIComponent(project.render.providerRenderId)}?data=false`);
  const result = data.response || {};
  const providerStatus = String(result.status || "queued").toLowerCase();
  if (["failed", "error"].includes(providerStatus)) {
    project.render.status = "failed"; project.render.error = result.error || "Shotstack could not complete this render.";
    await env.DB.prepare("UPDATE render_jobs SET status='failed', error_message=?, updated_at=? WHERE id=?").bind(project.render.error, now(), project.render.id).run();
    await saveProject(env, project);
  } else if (["done", "complete"].includes(providerStatus) && result.url) {
    await persistCompletedRender(env, project, result.url, "master");
  } else {
    project.render.status = providerStatus === "rendering" ? "rendering" : "queued";
    await env.DB.prepare("UPDATE render_jobs SET status=?, updated_at=? WHERE id=?").bind(project.render.status, now(), project.render.id).run();
    await saveProject(env, project);
  }
  if (project.render.releaseRenderIds) {
  project.render.outputs ||= {};

  for (const [format, renderId] of Object.entries(project.render.releaseRenderIds)) {
    if (format === "master" || project.render.outputs[format] || !renderId) continue;

    const formatData = await shotstackRequest(
      env,
      `/render/${encodeURIComponent(renderId)}?data=false`
    );

    const formatResult = formatData.response || {};
    const formatStatus = String(formatResult.status || "").toLowerCase();

    if (["done", "complete"].includes(formatStatus) && formatResult.url) {
      await persistCompletedRender(env, project, formatResult.url, format);
    }
  }

  await saveProject(env, project);
}
  return project.render;
}

async function serveR2Object(request, env, key, cacheControl = "private, no-store") {
  const rangeHeader = request.headers.get("range");
  let range;
  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
    if (!match) return new Response(null, { status: 416 });
    if (match[1] && match[2]) range = { offset: Number(match[1]), length: Number(match[2]) - Number(match[1]) + 1 };
    else if (match[1]) range = { offset: Number(match[1]) }; else if (match[2]) range = { suffix: Number(match[2]) };
  }
  const object = await env.MEDIA.get(key, range ? { range } : undefined);
  if (!object) return json({ message: "Video not found." }, 404);
  const headers = mediaHeaders(object, request); headers.set("cache-control", cacheControl);
  return new Response(object.body, { status: rangeHeader ? 206 : 200, headers });
}

const htmlEscape = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

async function sharedProject(env, token) {
  const row = await env.DB.prepare("SELECT project_json FROM projects WHERE json_extract(project_json, '$.share.token') = ? AND json_extract(project_json, '$.share.enabled') = 1 LIMIT 1").bind(token).first();
  if (!row) return null;
  const project = JSON.parse(row.project_json);
  return project.render?.status === "complete" && project.render?.stored ? project : null;
}

async function sharedMemorialProject(env, token) {
  const row = await env.DB.prepare("SELECT project_json FROM projects WHERE json_extract(project_json, '$.obituary.share.token') = ? AND json_extract(project_json, '$.obituary.share.enabled') = 1 LIMIT 1").bind(token).first();
  if (!row) return null;
  const project = JSON.parse(row.project_json);
  return project.obituary?.obituary ? project : null;
}

function memorialLinksPage(project, token, origin) {
  const obituary = cleanObituaryInput(project.obituary || {});
  const name = htmlEscape(obituary.details.name || project.title || "In Loving Memory");
  const memorialUrl = `${origin}/memorial/${encodeURIComponent(token)}`;
  const livestreamUrl = obituary.share.livestreamUrl;
  const livestreamButton = livestreamUrl ? `<a class="choice live" href="${htmlEscape(livestreamUrl)}" target="_blank" rel="noopener noreferrer"><span>Watch Livestream</span><small>Open the service livestream</small></a>` : `<div class="choice disabled"><span>Livestream</span><small>A livestream link has not been added yet.</small></div>`;
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${name} | Memorial Links</title><style>
  *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d1512;color:#efe8d8;font:16px/1.55 system-ui,-apple-system,Segoe UI,sans-serif;background-image:radial-gradient(circle at 50% -10%,#20362c 0,#0d1512 52%)}.wrap{width:min(720px,100%);padding:24px}.card{background:linear-gradient(180deg,#14241d,#101b16);border:1px solid #6d5b38;border-radius:26px;padding:clamp(28px,6vw,56px);box-shadow:0 30px 80px #0008;text-align:center}.brand{letter-spacing:.22em;text-transform:uppercase;color:#c6a35f;font-size:.72rem;font-weight:800}.mark{color:#c6a35f;font:2rem Georgia,serif;margin:12px 0 2px}h1{font:500 clamp(2rem,6vw,4rem)/1.08 Georgia,serif;color:#fff9ec;margin:.2em 0}.lead{color:#c8beaa;max-width:540px;margin:0 auto 28px}.choices{display:grid;gap:14px;max-width:520px;margin:auto}.choice{display:block;text-align:left;text-decoration:none;border:1px solid #76623d;border-radius:16px;padding:18px 20px;background:#17251f;color:#fff8e8;transition:.15s transform,.15s border-color}.choice:hover{transform:translateY(-1px);border-color:#c6a35f}.choice span{display:block;font:600 1.35rem Georgia,serif}.choice small{display:block;color:#b9ae99;margin-top:3px}.choice.live{background:#c6a35f;color:#102019;border-color:#c6a35f}.choice.live small{color:#263b31}.choice.disabled{opacity:.58;cursor:default}.note{margin-top:24px;color:#8f8675;font-size:.82rem}.note strong{color:#c6a35f}@media(max-width:520px){.wrap{padding:12px}.card{padding:30px 20px;border-radius:18px}}
  </style></head><body><main class="wrap"><section class="card"><div class="brand">Always &amp; Forever</div><div class="mark">✦</div><h1>${name}</h1><p class="lead">Choose where you would like to go. This single QR code can provide both the obituary and the livestream destination.</p><div class="choices"><a class="choice" href="${memorialUrl}"><span>View Obituary &amp; Memorial</span><small>Read and share the memorial</small></a>${livestreamButton}</div><div class="note">One QR code · two destinations · preserved with <strong>Always &amp; Forever</strong></div></section></main></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
}

function memorialPage(project, token, origin) {
  const obituary = cleanObituaryInput(project.obituary || {});
  const name = htmlEscape(obituary.details.name || project.title || "In Loving Memory");
  const dates = [obituary.details.birthDate, obituary.details.passingDate].filter(Boolean).map(htmlEscape).join(" — ");
  const paragraphs = String(obituary.obituary || "").split(/\n\s*\n/).map((paragraph) => `<p>${htmlEscape(paragraph).replace(/\n/g, "<br>")}</p>`).join("");
  const service = obituary.details.serviceDetails ? `<section class="service"><div class="eyebrow">Service Information</div><p>${htmlEscape(obituary.details.serviceDetails).replace(/\n/g, "<br>")}</p></section>` : "";
  const closing = obituary.details.closingMessage ? `<blockquote>${htmlEscape(obituary.details.closingMessage).replace(/\n/g, "<br>")}</blockquote>` : "";
  const qr = `${origin}/memorial/${encodeURIComponent(token)}/qr.svg`;
  const livestreamUrl = obituary.share.livestreamUrl;
  const livestream = livestreamUrl ? `<section class="service livestream"><div class="eyebrow">Livestream</div><p>Join the memorial service online.</p><a class="live-button" href="${htmlEscape(livestreamUrl)}" target="_blank" rel="noopener noreferrer">Watch Livestream</a></section>` : "";
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${name} | Always &amp; Forever Memorial</title><style>
  :root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0d1512;color:#efe8d8;font:17px/1.8 system-ui,-apple-system,Segoe UI,sans-serif;background-image:radial-gradient(circle at 50% -10%,#20362c 0,#0d1512 48%)}
  .wrap{max-width:980px;margin:auto;padding:clamp(24px,5vw,72px)}.card{background:linear-gradient(180deg,#14241d,#101b16);border:1px solid #6d5b38;border-radius:28px;padding:clamp(26px,6vw,68px);box-shadow:0 30px 80px #0008}
  .brand{text-align:center;letter-spacing:.24em;text-transform:uppercase;color:#c6a35f;font-size:.72rem;font-weight:800}.mark{text-align:center;color:#c6a35f;font:2rem Georgia,serif;margin:10px 0 4px}.eyebrow{text-transform:uppercase;letter-spacing:.16em;color:#c6a35f;font-size:.72rem;font-weight:800}
  h1{text-align:center;font-family:Georgia,serif;font-size:clamp(2.5rem,7vw,5rem);line-height:1.02;margin:.18em 0;color:#fff9ec;font-weight:500}.dates{text-align:center;color:#cfc4ad;margin-bottom:42px;letter-spacing:.06em}.obituary{max-width:760px;margin:auto;color:#ede5d4}.obituary p{margin:0 0 1.35em}
  blockquote{max-width:680px;margin:38px auto 0;padding:24px 30px;border-left:2px solid #c6a35f;background:#0d1713;border-radius:0 14px 14px 0;color:#f3ead8;font-family:Georgia,serif;font-size:1.12rem}.service{max-width:680px;margin:38px auto 0;padding:24px;border:1px solid #4b4938;border-radius:16px;background:#0d1713}.service p{margin:8px 0 0}.live-button{display:inline-block;margin-top:14px;padding:11px 16px;border-radius:10px;background:#c6a35f;color:#102019;text-decoration:none;font-weight:800}.livestream{text-align:center}
  .share{text-align:center;border-top:1px solid #3d4439;margin-top:48px;padding-top:34px}.share img{width:170px;height:170px;background:#fffdf8;padding:8px;border-radius:12px}.share small{display:block;color:#afa58f;margin-top:10px}.share-actions{max-width:720px;margin:24px auto 0;padding:22px;border:1px solid #544b35;border-radius:18px;background:#0b1511}.share-actions h2{font:500 1.55rem Georgia,serif;color:#fff7e8;margin:0 0 8px}.share-actions p{color:#bdb3a0;font-size:.92rem;margin:0 0 15px}.share-buttons{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.share-button{appearance:none;border:1px solid #876f42;background:#17251f;color:#f4ead8;border-radius:10px;padding:11px 10px;font:700 .88rem system-ui;cursor:pointer;text-decoration:none;display:grid;place-items:center}.share-button.primary{background:#c6a35f;color:#102019;border-color:#c6a35f}.share-feedback{min-height:1.2em;margin-top:10px;color:#c6a35f;font-size:.82rem}.footer{text-align:center;margin-top:30px;color:#8f8675;font-size:.8rem}.footer strong{color:#c6a35f}
  @media(max-width:600px){.wrap{padding:12px}.card{border-radius:18px;padding:28px 20px}.share img{width:150px;height:150px}.share-buttons{grid-template-columns:1fr 1fr}.share-button.primary{grid-column:1/-1}}
  </style></head><body><main class="wrap"><article class="card"><div class="brand">Always &amp; Forever</div><div class="mark">✦</div><h1>${name}</h1>${dates ? `<div class="dates">${dates}</div>` : ""}<section class="obituary">${paragraphs}</section>${service}${livestream}${closing}<div class="share" id="share"><img src="${qr}" alt="QR code for this memorial"><small>Scan to return to this memorial.</small><section class="share-actions"><h2>Share This Memorial</h2><p>Continue sharing from your phone or computer. On a phone, More Share Options opens the apps installed on your device.</p><div class="share-buttons"><button id="memorial-native-share" class="share-button primary" type="button">More Share Options</button><button id="memorial-facebook" class="share-button" type="button">Facebook</button><button id="memorial-whatsapp" class="share-button" type="button">WhatsApp</button><button id="memorial-sms" class="share-button" type="button">Text Message</button><button id="memorial-email" class="share-button" type="button">Email</button><button id="memorial-copy" class="share-button" type="button">Copy Link</button><a class="share-button" href="${qr}" download="always-forever-memorial-qr.svg">Download QR</a></div><div id="share-feedback" class="share-feedback"></div></section></div><div class="footer">A memorial preserved with <strong>Always &amp; Forever</strong></div></article></main><script>
  (()=>{const url=location.origin+location.pathname;const text=${JSON.stringify(`In loving memory of ${obituary.details.name || project.title || "a loved one"}. View and share this memorial.`)};const feedback=document.getElementById('share-feedback');const open=u=>window.open(u,'_blank','noopener,noreferrer');document.getElementById('memorial-native-share').onclick=async()=>{try{if(navigator.share){await navigator.share({title:'Always & Forever Memorial',text,url});feedback.textContent='Share menu opened.'}else{await navigator.clipboard.writeText(url);feedback.textContent='Memorial link copied.'}}catch(e){if(e?.name!=='AbortError')feedback.textContent='Use Copy Link to share this memorial.'}};document.getElementById('memorial-facebook').onclick=()=>open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(url));document.getElementById('memorial-whatsapp').onclick=()=>open('https://wa.me/?text='+encodeURIComponent(text+' '+url));document.getElementById('memorial-sms').onclick=()=>{location.href='sms:?&body='+encodeURIComponent(text+' '+url)};document.getElementById('memorial-email').onclick=()=>{location.href='mailto:?subject='+encodeURIComponent('Always & Forever Memorial')+'&body='+encodeURIComponent(text+'\n\n'+url)};document.getElementById('memorial-copy').onclick=async()=>{try{await navigator.clipboard.writeText(url);feedback.textContent='Memorial link copied.'}catch(e){feedback.textContent='Press and hold the address bar to copy the link.'}};if(location.hash==='#share')document.getElementById('share').scrollIntoView({behavior:'smooth',block:'start'});})();
  </script></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" } });
}

function obituaryWriterPage() {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI Obituary Writer | Always & Forever</title><style>
  *{box-sizing:border-box}body{margin:0;background:#0d1512;color:#f1eadb;font:16px/1.55 system-ui,-apple-system,Segoe UI,sans-serif}.top{border-bottom:1px solid #394238;background:#112019;padding:18px 24px;position:sticky;top:0;z-index:5}.brand{max-width:1100px;margin:auto;color:#c7a45f;letter-spacing:.18em;text-transform:uppercase;font-weight:800}.wrap{max-width:1100px;margin:auto;padding:34px 20px 70px}.intro{text-align:center;max-width:760px;margin:0 auto 32px}.intro h1{font:500 clamp(2.2rem,6vw,4.3rem)/1.05 Georgia,serif;margin:.2em 0;color:#fff8e8}.intro p{color:#c9c1b0}.card{background:#14231d;border:1px solid #4b4a38;border-radius:20px;padding:clamp(20px,4vw,38px);box-shadow:0 20px 60px #0005}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.field{display:block;margin:0 0 16px;color:#d9d0bd;font-weight:650}.field input,.field textarea,.field select{width:100%;margin-top:7px;padding:12px 13px;border:1px solid #4e594d;border-radius:10px;background:#0e1814;color:#fff8ea;font:inherit}.field textarea{resize:vertical}.wide{grid-column:1/-1}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:14px}.btn{border:1px solid #a8894c;background:#c5a15e;color:#111b16;padding:12px 18px;border-radius:10px;font-weight:800;cursor:pointer;text-decoration:none;display:inline-block}.btn.secondary{background:transparent;color:#eadcbf}.result{margin-top:26px}.result textarea{min-height:360px}.share{margin-top:24px;padding:22px;border:1px solid #665636;border-radius:16px;background:#0e1814;display:grid;grid-template-columns:1fr 180px;gap:24px;align-items:center}.share img{width:180px;height:180px;background:#fff;padding:8px;border-radius:10px}.share-url{word-break:break-all;color:#b9ae98;font-size:.88rem;margin:8px 0 14px}.social-title{margin:20px 0 8px;color:#f5ead2;font-weight:800}.social-actions{display:flex;gap:9px;flex-wrap:wrap}.social-actions .btn{font-size:.88rem;padding:10px 13px}.status{margin:12px 0;color:#c7a45f}.admin-tools{display:flex;justify-content:flex-end;margin:-8px 0 18px}.admin-tools .btn{border-color:#806f4d;color:#e8dac0;background:#101b16}.hidden{display:none!important}@media(max-width:720px){.grid{grid-template-columns:1fr}.share{grid-template-columns:1fr;text-align:center}.share img{margin:auto}}
  </style></head><body><header class="top"><div class="brand">A&amp;F · Always &amp; Forever</div></header><main class="wrap"><section class="intro"><small style="color:#c7a45f;letter-spacing:.17em;text-transform:uppercase">Share their story beautifully</small><h1>AI Obituary Writer</h1><p>Create an editable obituary and an independent memorial page with its own QR code. No video is required.</p></section><section class="card"><div id="admin-tools" class="admin-tools hidden"><button id="new-obituary" type="button" class="btn secondary">Clear / New Obituary</button></div><form id="form"><div class="grid">
  <label class="field">Deceased's name<input name="name" required></label><label class="field">Nickname<input name="nickname"></label>
  <label class="field">Birth date<input name="birthDate" type="date"></label><label class="field">Passing date<input name="passingDate" type="date"></label>
  <label class="field wide">Hometown or places called home<input name="hometown"></label>
  <label class="field wide">Relationships and surviving family<textarea name="survivingFamily" rows="3"></textarea></label><label class="field wide">Preceded in death by<textarea name="precededInDeath" rows="3"></textarea></label>
  <label class="field wide">Education and career<textarea name="educationCareer" rows="3"></textarea></label><label class="field wide">Military service<textarea name="militaryService" rows="2"></textarea></label>
  <label class="field wide">Hobbies and passions<textarea name="hobbiesPassions" rows="3"></textarea></label><label class="field wide">Church and community involvement<textarea name="churchCommunity" rows="3"></textarea></label>
  <label class="field wide">Personality traits<textarea name="personalityTraits" rows="3"></textarea></label><label class="field wide">Favorite memories<textarea name="favoriteMemories" rows="4"></textarea></label>
  <label class="field wide">Service details<textarea name="serviceDetails" rows="3"></textarea></label><label class="field wide">Livestream URL (optional)<input name="livestreamUrl" type="url" placeholder="https://youtube.com/live/... or another livestream link"><small style="display:block;margin-top:6px;color:#9f9684;font-weight:400">When added, the memorial page includes a Watch Livestream button alongside the obituary.</small></label><label class="field wide">Closing message or Bible verse<textarea name="closingMessage" rows="3"></textarea></label>
  <label class="field wide">Write from memories<textarea name="memories" rows="6"></textarea></label>
  <label class="field">Tone<select name="tone"><option>Traditional</option><option selected>Warm &amp; Personal</option><option>Celebration of Life</option><option>Faith-Based</option><option>Short Newspaper Style</option></select></label><label class="field">Length<select name="length"><option>Short</option><option selected>Standard</option><option>Detailed</option></select></label>
  </div><button class="btn" type="submit">Generate Obituary</button><div id="status" class="status"></div></form>
  <div id="result" class="result hidden"><label class="field">Editable obituary<textarea id="obituary"></textarea></label><div class="actions"><button id="save" class="btn" type="button">Save & Create Memorial</button><button id="regen" class="btn secondary" type="button">Regenerate</button></div>
  <div id="share" class="share hidden"><div><small style="color:#c7a45f;letter-spacing:.15em">MEMORIAL PAGE READY</small><h2 style="font-family:Georgia,serif;font-size:2rem;margin:.25em 0">Memorial QR Code</h2><p>This permanent QR code opens the memorial page. When a livestream URL is added, visitors can choose the obituary or open the livestream from the same page.</p><div id="share-url" class="share-url"></div><div class="actions"><a id="view" class="btn secondary" target="_blank" rel="noopener">View Memorial</a><a id="download" class="btn secondary" download="always-forever-memorial-qr.svg">Download QR</a><button id="copy" class="btn secondary" type="button">Copy Link</button></div><div class="social-title">Share Memorial</div><div class="social-actions"><button id="share-more" class="btn" type="button">More Share Options</button><button id="share-qr-image" class="btn secondary" type="button">Share QR Image</button><button id="share-facebook" class="btn secondary" type="button">Facebook</button><button id="share-x" class="btn secondary" type="button">X</button><button id="share-whatsapp" class="btn secondary" type="button">WhatsApp</button><button id="share-email" class="btn secondary" type="button">Email</button></div><small style="display:block;margin-top:10px;color:#9f9684">On phones, More Share Options opens your device share menu. The memorial page also keeps these share controls available after someone opens it from Facebook or another app.</small></div><img id="qr" alt="Memorial QR code"></div></div>
  </section></main><script>
  const $=s=>document.querySelector(s);let project=null;const fields=['name','nickname','birthDate','passingDate','hometown','survivingFamily','precededInDeath','educationCareer','militaryService','hobbiesPassions','churchCommunity','personalityTraits','favoriteMemories','serviceDetails','closingMessage','memories'];const DRAFT_KEY='af-obituary-writer-draft-v1';
  async function req(url,options={}){const r=await fetch(url,{...options,headers:{'content-type':'application/json',...(options.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Request failed.');return d}
  function payload(){const f=new FormData($('#form')),details={};fields.forEach(k=>details[k]=String(f.get(k)||''));return{details,tone:String(f.get('tone')||'Warm & Personal'),length:String(f.get('length')||'Standard'),obituary:$('#obituary').value||project?.obituary?.obituary||'',share:{...(project?.obituary?.share||{}),livestreamUrl:String(f.get('livestreamUrl')||'').trim()}}}
  function saveDraft(){try{localStorage.setItem(DRAFT_KEY,JSON.stringify(payload()))}catch(e){}}
  function restoreDraft(){try{const raw=localStorage.getItem(DRAFT_KEY);if(!raw)return;const o=JSON.parse(raw),det=o.details||{};fields.forEach(k=>{const el=$('[name="'+k+'"]');if(el&&!el.value)el.value=det[k]||''});if(o.tone)$('[name=tone]').value=o.tone;if(o.length)$('[name=length]').value=o.length;if(o.obituary&&!$('#obituary').value){$('#obituary').value=o.obituary;$('#result').classList.remove('hidden')}}catch(e){}}
  async function init(){try{const d=await req('/api/projects');project=(d.projects||[]).find(p=>p.entitlement?.kind==='obituary')||(d.projects||[])[0]||null;if(!project){project=(await req('/api/projects',{method:'POST',body:JSON.stringify({title:'My Obituary'})})).project}else{project=(await req('/api/projects/'+project.id)).project}if(project?.entitlement?.administrator)$('#admin-tools').classList.remove('hidden');const o=project.obituary||{},det=o.details||{};fields.forEach(k=>{const el=$('[name="'+k+'"]');if(el)el.value=det[k]||''});if(o.tone)$('[name=tone]').value=o.tone;if(o.length)$('[name=length]').value=o.length;if(o.share?.livestreamUrl)$('[name=livestreamUrl]').value=o.share.livestreamUrl;if(o.obituary){$('#obituary').value=o.obituary;$('#result').classList.remove('hidden')}if(o.share?.enabled&&o.share?.token)showShare({memorialUrl:location.origin+'/memorial/'+o.share.token,qrUrl:location.origin+'/memorial/'+o.share.token+'/qr.svg'})}catch(e){$('#status').textContent=e.message}}
  async function generate(){if(!project)throw new Error('Obituary Writer is still loading. Please try again in a moment.');const submit=$('#form button[type=submit]');saveDraft();submit.disabled=true;submit.textContent='Creating obituary…';$('#status').textContent='Writing obituary… Your entries are saved while this runs.';try{project=(await req('/api/projects/'+project.id,{method:'PUT',body:JSON.stringify({obituary:payload()})})).project;const d=await req('/api/projects/'+project.id+'/obituary/generate',{method:'POST',body:JSON.stringify(payload())});$('#obituary').value=d.obituary;$('#result').classList.remove('hidden');saveDraft();project=(await req('/api/projects/'+project.id)).project;$('#status').textContent='Obituary created. Review it below, then save the memorial.';$('#result').scrollIntoView({behavior:'smooth',block:'start'})}catch(e){restoreDraft();$('#status').textContent='Could not create the obituary: '+e.message;throw e}finally{submit.disabled=false;submit.textContent='Generate Obituary'}}
  async function saveShare(){$('#status').textContent='Saving memorial…';project=(await req('/api/projects/'+project.id,{method:'PUT',body:JSON.stringify({obituary:payload()})})).project;const d=await req('/api/projects/'+project.id+'/obituary/share',{method:'POST',body:'{}'});project=(await req('/api/projects/'+project.id)).project;showShare(d);$('#status').textContent='Memorial page and QR code are ready.'}
  async function socialQrFile(d){const svg=await(await fetch(d.qrUrl)).blob(),url=URL.createObjectURL(svg),img=new Image();await new Promise((ok,bad)=>{img.onload=ok;img.onerror=bad;img.src=url});const c=document.createElement('canvas');c.width=c.height=1080;const x=c.getContext('2d');x.fillStyle='#0d1512';x.fillRect(0,0,1080,1080);x.fillStyle='#c7a45f';x.textAlign='center';x.font='700 30px system-ui';x.fillText('ALWAYS & FOREVER',540,105);x.fillStyle='#fff8e8';x.font='52px Georgia';x.fillText((project?.obituary?.details?.name||'In Loving Memory').slice(0,36),540,185);x.fillStyle='#fff';x.fillRect(165,235,750,750);x.drawImage(img,210,280,660,660);URL.revokeObjectURL(url);const blob=await new Promise(r=>c.toBlob(r,'image/png'));return new File([blob],'always-forever-memorial-qr.png',{type:'image/png'})}
  function socialText(){const n=project?.obituary?.details?.name||'a loved one';return 'In loving memory of '+n+'. View and share this memorial.'}
  async function shareQrImage(d){try{const file=await socialQrFile(d);if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title:'Always & Forever Memorial',text:socialText(),files:[file]});return}const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);$('#status').textContent='QR social image downloaded. Upload it to your social media app.'}catch(e){$('#status').textContent=e.message||'Unable to share QR image.'}}
  function socialOpen(url){window.open(url,'_blank','noopener,noreferrer')}
  async function shareMore(d){try{if(navigator.share){await navigator.share({title:'Always & Forever Memorial',text:socialText(),url:d.memorialUrl});return}await navigator.clipboard.writeText(d.memorialUrl);$('#status').textContent='Memorial link copied. Open it on your phone to continue sharing.'}catch(e){if(e?.name!=='AbortError')$('#status').textContent='Use Copy Link to share this memorial.'}}
  function resetWriter(){try{localStorage.removeItem(DRAFT_KEY)}catch(e){}$('#form').reset();$('[name=tone]').value='Warm & Personal';$('[name=length]').value='Standard';$('#obituary').value='';$('#result').classList.add('hidden');$('#share').classList.add('hidden');$('#status').textContent='Ready for a new obituary.';window.scrollTo({top:0,behavior:'smooth'})}
  async function newObituary(){if(!project?.entitlement?.administrator)return;if(!confirm('Start a new obituary? The memorial you already created will remain available, but this form will switch to a new project.'))return;$('#status').textContent='Starting a new obituary…';const d=await req('/api/projects',{method:'POST',body:JSON.stringify({title:'New Obituary'})});project=d.project;resetWriter();$('#admin-tools').classList.remove('hidden')}
  function showShare(d){$('#share').classList.remove('hidden');$('#share-url').textContent=d.memorialUrl;$('#view').href=d.memorialUrl;$('#download').href=d.qrUrl;$('#qr').src=d.qrUrl;$('#copy').onclick=()=>navigator.clipboard.writeText(d.memorialUrl);$('#share-more').onclick=()=>shareMore(d);$('#share-qr-image').onclick=()=>shareQrImage(d);$('#share-facebook').onclick=()=>socialOpen('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(d.memorialUrl));$('#share-x').onclick=()=>socialOpen('https://twitter.com/intent/tweet?text='+encodeURIComponent(socialText())+'&url='+encodeURIComponent(d.memorialUrl));$('#share-whatsapp').onclick=()=>socialOpen('https://wa.me/?text='+encodeURIComponent(socialText()+' '+d.memorialUrl));$('#share-email').onclick=()=>location.href='mailto:?subject='+encodeURIComponent('Always & Forever Memorial')+'&body='+encodeURIComponent(socialText()+'\\n\\n'+d.memorialUrl)}
  $('#form').addEventListener('submit',e=>{e.preventDefault();e.stopPropagation();generate().catch(()=>{})});$('#form').addEventListener('input',saveDraft);$('#form').addEventListener('change',saveDraft);$('#obituary').addEventListener('input',saveDraft);$('#regen').onclick=()=>generate().catch(()=>{});$('#save').onclick=()=>saveShare().catch(e=>$('#status').textContent=e.message);$('#new-obituary').onclick=()=>newObituary().catch(e=>$('#status').textContent=e.message);restoreDraft();init();
  </script></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
function sharePage(project, token, origin) {
  const title = htmlEscape(project.title || "Always & Forever Video");
  const caption = htmlEscape(project.settings?.releaseCaption || "A story worth sharing.");
  const video = `${origin}/shared-video/${encodeURIComponent(token)}`;
  const qr = `${origin}/share/${encodeURIComponent(token)}/qr.svg`;
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{margin:0;background:#eef1e9;color:#23372e;font:17px/1.6 system-ui,sans-serif}.wrap{max-width:960px;margin:auto;padding:clamp(24px,5vw,64px)}.card{background:#fffaf0;border:1px solid #c9d2c3;border-radius:24px;padding:clamp(20px,4vw,48px);box-shadow:0 18px 50px #23372e22;text-align:center}h1{font-family:Georgia,serif;font-size:clamp(2rem,6vw,4rem);margin:.2em}video{width:100%;border-radius:16px;background:#14231d;box-shadow:0 12px 34px #0003}img{width:150px;height:150px;margin-top:24px}.brand{letter-spacing:.16em;text-transform:uppercase;color:#806c42;font-size:.78rem}</style></head><body><main class="wrap"><article class="card"><div class="brand">Always &amp; Forever</div><h1>${title}</h1><p>${caption}</p><video controls playsinline preload="metadata" src="${video}"></video><div><img src="${qr}" alt="QR code for this video"></div></article></main></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" } });
}

async function api(request, env, url) {
  const parts = url.pathname.split("/").filter(Boolean);
  if (url.pathname === "/api/health") return json({ ok: true, version: VERSION, mode: "cloudflare" });
  if (url.pathname === "/api/templates" && request.method === "GET") return json({ templates: TEMPLATES.map(publicTemplate) });
  if (url.pathname === "/api/safe-music" && request.method === "GET") return json({ tracks: await listSafeMusic(env) });
  if (url.pathname === "/api/admin/safe-music" && request.method === "GET") {
    if (!await requireMusicAdmin(request, env)) return json({ message: "Administrator access required." }, 401);
    return json({ tracks: await listSafeMusic(env, true) });
  }
  if (url.pathname === "/api/admin/safe-music" && request.method === "POST") {
    if (!await requireMusicAdmin(request, env)) return json({ message: "Administrator access required." }, 401);
    const filename = safe(decodeURIComponent(request.headers.get("x-file-name") || "track.mp3"));
    const mime = String(request.headers.get("content-type") || "").split(";")[0];
    const length = Number(request.headers.get("content-length") || 0);
    if (!/^audio\/(mpeg|mp4|wav|x-wav)$/.test(mime)) return json({ message: "Upload an MP3, M4A, or WAV audio file." }, 415);
    if (!length || length > MAX_UPLOAD_BYTES || !request.body) return json({ message: "Music files must be between 1 byte and 95 MB." }, 413);
    const id = crypto.randomUUID();
    const extension = filename.includes(".") ? `.${filename.split(".").pop().toLowerCase()}` : "";
    const stored = `catalog/music/${id}/${id}${extension}`;
    const title = String(request.headers.get("x-track-title") || filename.replace(/\.[^.]+$/, "")).slice(0, 160);
    const artist = String(request.headers.get("x-track-artist") || "Always & Forever Music").slice(0, 160);
    const mood = String(request.headers.get("x-track-mood") || "Gentle").slice(0, 80);
    const occasions = parseList(request.headers.get("x-track-occasions"));
    const platforms = parseList(request.headers.get("x-track-platforms"));
    const provider = String(request.headers.get("x-license-provider") || "").slice(0, 160);
    const licenseReference = String(request.headers.get("x-license-reference") || "").slice(0, 300);
    const licenseVersion = String(request.headers.get("x-license-version") || "").slice(0, 80);
    const contentIdPolicy = String(request.headers.get("x-content-id-policy") || "not-registered").slice(0, 80);
    const duration = Math.max(0, Number(request.headers.get("x-duration-seconds") || 0));
    if (!provider || !licenseReference || !platforms.length) return json({ message: "Provider, license reference, and permitted platforms are required." }, 400);
    await env.MEDIA.put(stored, request.body, { httpMetadata: { contentType: mime }, customMetadata: { catalog: "safe-music", title, artist } });
    const timestamp = now();
    await env.DB.prepare(`INSERT INTO safe_music_tracks (id,title,artist,mood,occasions_json,duration_seconds,provider,license_reference,license_version,platforms_json,content_id_policy,status,stored,mime,bytes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(id,title,artist,mood,JSON.stringify(occasions),duration,provider,licenseReference,licenseVersion,JSON.stringify(platforms),contentIdPolicy,"inactive",stored,mime,length,timestamp,timestamp).run();
    return json({ track: { id, title, status: "inactive" }, message: "Track uploaded as inactive. Review the rights record before publishing." }, 201);
  }
  if (parts[0] === "api" && parts[1] === "admin" && parts[2] === "safe-music" && parts[3]) {
    if (!await requireMusicAdmin(request, env)) return json({ message: "Administrator access required." }, 401);
    const trackId = safe(parts[3]);
    const track = await env.DB.prepare("SELECT * FROM safe_music_tracks WHERE id = ?").bind(trackId).first();
    if (!track) return json({ message: "Track not found." }, 404);
    if (request.method === "PATCH") {
      const body = await parseJson(request);
      const status = body.status === "active" ? "active" : "inactive";
      await env.DB.prepare("UPDATE safe_music_tracks SET status = ?, updated_at = ? WHERE id = ?").bind(status, now(), trackId).run();
      return json({ updated: true, status });
    }
    if (request.method === "DELETE") {
      await env.MEDIA.delete(track.stored);
      await env.DB.prepare("DELETE FROM safe_music_tracks WHERE id = ?").bind(trackId).run();
      return json({ deleted: true });
    }
  }
  const session = await studioSession(request, env);
  if (!session) return json({ message: "Please open Creator Studio from your Always & Forever account." }, 401);
  const owner = session.owner;
  if (url.pathname === "/api/projects" && request.method === "GET") {
    const projects = await listProjects(env, owner);
    if (session.role === "administrator") for (const item of projects) item.entitlement = { ...(item.entitlement || {}), paid: true, administrator: true, grantId: session.grantId };
    return json({ projects });
  }
  if (url.pathname === "/api/projects" && request.method === "POST") {
    const body = await parseJson(request);
    if (session.role !== "administrator") {
  const existingProject = await loadProjectByGrant(env, owner, session.grantId);
  if (existingProject) {
    return json({ project: existingProject }, 200);
  }
}
    if (session.role !== "administrator") {
      const claimed = await env.DB.prepare("UPDATE studio_grants SET projects_created = projects_created + 1, updated_at = ? WHERE id = ? AND owner_id = ? AND status = 'active' AND projects_created < project_limit").bind(now(), session.grantId, owner).run();
      if (!claimed.meta?.changes) return json({ message: "This package has reached its project limit." }, 403);
    }
    const project = projectTemplate(owner, String(body.title || "My Story").slice(0, 160));
    project.entitlement = session.role === "administrator" ? { paid: true, administrator: true, grantId: session.grantId } : { paid: true, grantId: session.grantId, ...session.package };
    const template = TEMPLATES.find((item) => item.id === body.templateId);
    return json({ project: await saveProject(env, template ? applyTemplate(project, template) : project) }, 201);
  }
  if (parts[0] !== "api" || parts[1] !== "projects" || !parts[2]) return json({ message: "API route not found." }, 404);
  const id = safe(parts[2]);
  const project = await loadProject(env, owner, id);
  if (!project) return json({ message: "Project not found." }, 404);

  if (parts.length === 3 && request.method === "GET") return json({ project });
  if (parts.length === 3 && request.method === "PUT") {
    const body = await parseJson(request);
    
    if (session.role !== "administrator" && Array.isArray(body.timeline)) {
      const visualSeconds = body.timeline.filter((item) => ["visual", "placeholder", "collage"].includes(item.type) || (item.type === "text" && !item.overlay)).reduce((sum, item) => sum + Math.max(0, Number(item.duration || 0)), 0);
      const allowedSeconds = Number(project.entitlement?.minutes || 0) * 60;
      if (allowedSeconds && visualSeconds > allowedSeconds) return json({ message: `This package supports a video up to ${project.entitlement.minutes} minutes. Shorten the timeline or upgrade the package.` }, 403);
    }
    const allowed = ["title", "occasion", "aspectRatio", "resolution", "duration", "canvas", "timeline", "settings", "effects", "render", "templateId"];
    for (const key of allowed) if (Object.hasOwn(body, key)) project[key] = body[key];
    if (Object.hasOwn(body, "obituary")) project.obituary = cleanObituaryInput(body.obituary);
    return json({ project: await saveProject(env, project) });
  }
  if (parts[3] === "obituary" && parts[4] === "generate" && request.method === "POST") {
    const body = cleanObituaryInput(await parseJson(request));
    if (!body.details.name && !body.details.memories) return json({ message: "Enter the deceased's name or share a memory before generating." }, 400);
    const facts = OBITUARY_FIELDS.map((field) => body.details[field] ? `${field}: ${body.details[field]}` : "").filter(Boolean).join("\n");
    const obituary = await openAIText(env,
      `You are a compassionate professional obituary writer. Write a ${body.length.toLowerCase()} obituary in a ${body.tone} tone. Use only facts supplied by the family. Never invent names, relationships, dates, achievements, service details, quotations, scripture, or religious beliefs. Omit missing facts naturally. Preserve the family's wording where meaningful. Return only the finished obituary in plain text with tasteful paragraphs.`,
      facts, body.length === "Detailed" ? 2600 : body.length === "Short" ? 900 : 1700);
    project.obituary = { ...body, obituary, videoScript: body.videoScript, updatedAt: now() };
    await saveProject(env, project);
    return json({ obituary, saved: true });
  }
  if (parts[3] === "obituary" && parts[4] === "share" && request.method === "POST") {
    const current = cleanObituaryInput(project.obituary || {});
    if (!current.obituary) return json({ message: "Create or save the obituary before creating its memorial QR code." }, 400);
    const requested = await parseJson(request).catch(() => ({}));
    if (Object.prototype.hasOwnProperty.call(requested, "livestreamUrl")) current.share.livestreamUrl = cleanOptionalHttpUrl(requested.livestreamUrl);
    if (!current.share.token) current.share.token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
    current.share.enabled = true;
    current.share.updatedAt = now();
    project.obituary = current;
    await saveProject(env, project);
    const memorialUrl = `${url.origin}/memorial/${current.share.token}`;
    const landingUrl = `${memorialUrl}/links`;
    return json({ enabled: true, memorialUrl, landingUrl, qrUrl: `${memorialUrl}/qr.svg`, livestreamUrl: current.share.livestreamUrl, token: current.share.token });
  }
  if (parts[3] === "obituary" && parts[4] === "video-script" && request.method === "POST") {
    const body = cleanObituaryInput(await parseJson(request));
    const source = body.obituary || project.obituary?.obituary || "";
    if (!source) return json({ message: "Create or write the obituary before making a video script." }, 400);
    const videoScript = await openAIText(env,
      "Turn the supplied obituary into a warm memorial-video narration of approximately 90 to 140 spoken words. Keep the most meaningful life details and emotional arc. Use only facts present in the obituary. Do not add stage directions, scene labels, music cues, headings, or invented details. Return only the narration.",
      source, 700);
    project.obituary = { ...cleanObituaryInput(project.obituary), ...body, obituary: source, videoScript, updatedAt: now() };
    await saveProject(env, project);
    return json({ videoScript, saved: true, shotstackReady: true });
  }
  if (parts[3] === "template" && parts.length === 4 && request.method === "POST") {
    const body = await parseJson(request);
    const template = TEMPLATES.find((item) => item.id === body.templateId);
    if (!template) return json({ message: "Template not found." }, 404);
    return json({ project: await saveProject(env, applyTemplate(project, template)) });
  }
  if (parts[3] === "assets" && parts.length === 4 && request.method === "POST") {
    const filename = safe(decodeURIComponent(request.headers.get("x-file-name") || "upload.bin"));
    const mime = String(request.headers.get("content-type") || "application/octet-stream").split(";")[0];
    const length = Number(request.headers.get("content-length") || 0);
    if (!ALLOWED_MIME.test(mime)) return json({ message: "Unsupported media type. Use JPEG, PNG, WebP, MP4, WebM, MP3, M4A, or WAV." }, 415);
    if (!Number.isFinite(length) || length <= 0 || !request.body) return json({ message: "The upload size could not be verified." }, 411);
    if (length > MAX_UPLOAD_BYTES) return json({ message: "This Phase 1 upload is limited to 95 MB per file." }, 413);
    const kind = mime.startsWith("image/") ? "photo" : mime.startsWith("video/") ? "video" : "audio";
    if (session.role !== "administrator") {
      const limit = kind === "photo" ? Number(project.entitlement?.photos || 0) : 0;
      if (limit && project.assets.filter((item) => item.kind === kind).length >= limit) return json({ message: kind === "photo" ? `This package includes ${limit} photos. Purchase additional photos or upgrade the package to continue.` : `This package includes ${limit} songs.` }, 403);
    }
    const assetId = crypto.randomUUID();
    const extension = filename.includes(".") ? `.${filename.split(".").pop().toLowerCase()}` : "";
    const stored = `${assetId}${extension}`;
    const key = `${owner}/${id}/${stored}`;
    const uploadBytes = await request.arrayBuffer();
await env.MEDIA.put(key, uploadBytes, { httpMetadata: { contentType: mime }, customMetadata: { owner, projectId: id, filename } });
const dimensions = kind === "photo" ? getImageDimensions(uploadBytes, mime) : null;
    const asset = { id: assetId, filename, stored, mime, kind, bytes: length, width: dimensions?.width || null, height: dimensions?.height || null, url: `/media/${encodeURIComponent(owner)}/${encodeURIComponent(id)}/${encodeURIComponent(stored)}`, createdAt: now() };
    project.assets.push(asset);
    await saveProject(env, project);
    return json({ asset }, 201);
  }
  if (parts[3] === "assets" && parts[4] && parts[5] === "remove-background" && parts.length === 6 && request.method === "POST") {
    if (!env.REMOVE_BG_API_KEY) return json({ message: "Background removal is not connected yet. Add the REMOVE_BG_API_KEY Cloudflare secret." }, 503);
    const original = project.assets.find((item) => item.id === parts[4] && item.kind === "photo");
    if (!original) return json({ message: "Select a valid photo asset." }, 404);
    if (Number(original.bytes || 0) > MAX_BACKGROUND_INPUT_BYTES) return json({ message: "Background removal accepts photos up to 22 MB." }, 413);
    const originalKey = `${owner}/${id}/${original.stored}`;
    const object = await env.MEDIA.get(originalKey);
    if (!object) return json({ message: "The original photo could not be loaded." }, 404);
    if (object.size > MAX_BACKGROUND_INPUT_BYTES) return json({ message: "Background removal accepts photos up to 22 MB." }, 413);
    const bytes = await object.arrayBuffer();
    const form = new FormData();
    form.append("size", "auto");
    form.append("image_file", new Blob([bytes], { type: original.mime }), original.filename);
    const processed = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": env.REMOVE_BG_API_KEY },
      body: form
    });
    if (!processed.ok || !processed.body) {
      console.error(JSON.stringify({ message: "background removal failed", projectId: id, assetId: original.id, providerStatus: processed.status }));
      return json({ message: `Background removal failed with provider status ${processed.status}.` }, 502);
    }
    const assetId = crypto.randomUUID();
    const stored = `${assetId}-no-bg.png`;
    const outputKey = `${owner}/${id}/${stored}`;
    await env.MEDIA.put(outputKey, processed.body, {
      httpMetadata: { contentType: "image/png" },
      customMetadata: { owner, projectId: id, filename: `${original.filename.replace(/\.[^.]+$/, "")}-no-bg.png`, sourceAssetId: original.id, operation: "background-removal" }
    });
    const output = await env.MEDIA.head(outputKey);
    const asset = {
      id: assetId,
      filename: `${original.filename.replace(/\.[^.]+$/, "")}-no-bg.png`,
      stored,
      mime: "image/png",
      kind: "photo",
      bytes: output?.size || 0,
      url: `/media/${encodeURIComponent(owner)}/${encodeURIComponent(id)}/${encodeURIComponent(stored)}`,
      createdAt: now(),
      sourceAssetId: original.id,
      processing: "background-removal"
    };
    project.assets.push(asset);
    await saveProject(env, project);
    return json({ asset, originalAssetId: original.id }, 201);
  }
  if (parts[3] === "assets" && parts[4] && request.method === "DELETE") {
    const asset = project.assets.find((item) => item.id === parts[4]);
    if (!asset) return json({ message: "Asset not found." }, 404);
    const uses = assetUses(project, asset.id);
    if (uses.length) return json({ message: "Remove this item from the timeline, collage, or motion background before deleting it from Media.", uses }, 409);
    await env.MEDIA.delete(`${owner}/${id}/${asset.stored}`);
    project.assets = project.assets.filter((item) => item.id !== asset.id);
    await saveProject(env, project);
    return json({ deleted: true });
  }
  if (parts[3] === "render" && request.method === "POST") {
    if (!env.SHOTSTACK_API_KEY) return json({ message: "Rendering is not connected yet. An administrator must add the Shotstack API key." }, 503);
    if (project.entitlement?.paid !== true && session.role !== "administrator") return json({ message: "Payment must be verified before creating the final video." }, 402);
    if (project.render && ["queued", "rendering"].includes(project.render.status)) return json({ render: await refreshRender(env, project), message: "This video is already rendering." }, 202);
    const releaseFormats = {
  master: "16:9",
  vertical: "9:16",
  portrait: "4:5",
  square: "1:1"
};
    const edit = await buildShotstackEdit(
  { ...project, aspectRatio: releaseFormats.master },
  request.url,
  env
);
    const submitted = await shotstackRequest(env, "/render", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(edit) });
    const providerRenderId = submitted.response?.id;
    const releaseRenderIds = {
  master: providerRenderId
};
    if (!providerRenderId) throw Object.assign(new Error("Shotstack accepted the request but did not return a render ID."), { status: 502 });
    for (const [format, aspectRatio] of Object.entries(releaseFormats)) {
  if (format === "master") continue;

  const formatEdit = await buildShotstackEdit(
    { ...project, aspectRatio },
    request.url,
    env
  );

  const formatSubmitted = await shotstackRequest(env, "/render", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(formatEdit)
  });

  const formatRenderId = formatSubmitted.response?.id;
  if (formatRenderId) releaseRenderIds[format] = formatRenderId;
}
    const timestamp = now();
    project.render = { id: crypto.randomUUID(), providerRenderId, releaseRenderIds, status: "queued", requestedAt: timestamp, provider: "shotstack", environment: env.SHOTSTACK_ENVIRONMENT === "v1" ? "production" : "sandbox" };
    await env.DB.prepare("INSERT INTO render_jobs (id, project_id, owner_id, provider, provider_render_id, status, created_at, updated_at) VALUES (?, ?, ?, 'shotstack', ?, 'queued', ?, ?)")
      .bind(project.render.id, project.id, owner, providerRenderId, timestamp, timestamp).run();
    await saveProject(env, project);
    return json({ render: project.render, message: project.render.environment === "sandbox" ? "Test render started. Sandbox videos may include a watermark." : "Final render started." }, 202);
  }
  if (parts[3] === "render" && request.method === "GET") return json({ render: await refreshRender(env, project) });
  if (parts[3] === "share" && request.method === "POST") {
    if (project.entitlement?.paid !== true || project.render?.status !== "complete" || !project.render?.stored) return json({ message: "Finish the paid video before creating its share page." }, 409);
    const body = await parseJson(request);
    project.share ||= {};
    project.share.enabled = body.enabled !== false;
    if (project.share.enabled && !project.share.token) project.share.token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
    project.share.updatedAt = now();
    await saveProject(env, project);
    const shareUrl = project.share.enabled ? `${url.origin}/share/${project.share.token}` : "";
    return json({ enabled: project.share.enabled, shareUrl, qrUrl: shareUrl ? `${shareUrl}/qr.svg` : "" });
  }
  return json({ message: "API route not found." }, 404);
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/test-obituary" || url.pathname === "/test-obituary/") return obituaryTestLoginPage();
      if (url.pathname === "/auth/test-obituary") return await acceptObituaryTestAccess(request, env);
      if (url.pathname === "/auth/woocommerce" || url.pathname === "/api/auth/woocommerce") return await acceptWooAccess(request, env, url);
      if (url.pathname.startsWith("/render-media/")) {
        if (!await validRenderMediaSignature(url, env)) return json({ message: "This render media link is invalid or expired." }, 403);
        const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
        if (parts.length !== 4) return json({ message: "Media not found." }, 404);
        const [owner, projectId, stored] = [safe(parts[1]), safe(parts[2]), safe(parts[3])];
        if (stored.startsWith("render-frame-")) {
  return await serveRenderDerivative(request, env, owner, projectId, stored);
}

return await serveMedia(request, env, owner, projectId, stored);
      }
      if (url.pathname === "/obituary-writer" || url.pathname === "/obituary-writer/") return obituaryWriterPage();
      if (url.pathname.startsWith("/memorial/")) {
        const parts = url.pathname.split("/").filter(Boolean);
        const token = safe(parts[1]);
        const project = await sharedMemorialProject(env, token);
        if (!project) return new Response("This memorial is not available.", { status: 404 });
        if (parts[2] === "qr.svg") {
          const { default: QRCode } = await import("qrcode");
          const svg = await QRCode.toString(`${url.origin}/memorial/${token}`, { type: "svg", width: 512, margin: 3, errorCorrectionLevel: "H", color: { dark: "#23372e", light: "#fffdf8" } });
          return new Response(svg, { headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "private, max-age=3600", "content-disposition": `inline; filename="always-forever-memorial-qr.svg"` } });
        }
        if (parts[2] === "links") return memorialLinksPage(project, token, url.origin);
        return memorialPage(project, token, url.origin);
      }
      if (url.pathname.startsWith("/share/")) {
        const parts = url.pathname.split("/").filter(Boolean);
        const token = safe(parts[1]);
        const project = await sharedProject(env, token);
        if (!project) return new Response("This shared video is not available.", { status: 404 });
        if (parts[2] === "qr.svg") {
          const { default: QRCode } = await import("qrcode");
          const svg = await QRCode.toString(`${url.origin}/share/${token}`, { type: "svg", width: 320, margin: 2, color: { dark: "#23372e", light: "#fffaf0" } });
          return new Response(svg, { headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "private, max-age=3600" } });
        }
        return sharePage(project, token, url.origin);
      }
      if (url.pathname.startsWith("/shared-video/")) {
        const token = safe(url.pathname.split("/").filter(Boolean)[1]);
        const project = await sharedProject(env, token);
        if (!project) return json({ message: "Video not found." }, 404);
        return serveR2Object(request, env, project.render.stored, "private, max-age=3600");
      }
      if (url.pathname.startsWith("/api/")) return await api(request, env, url);
      if (url.pathname.startsWith("/final/")) {
        const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
        const session = await studioSession(request, env);
        if (!session || parts.length !== 3) return json({ message: "Video not found." }, 404);
        const project = await loadProject(env, session.owner, safe(parts[1]));
        const filename = safe(parts[2]);
const masterFilename = `${project.render?.id}.mp4`;

if (project.entitlement?.paid !== true) {
  return json({ message: "Video not found." }, 404);
}

if (filename === masterFilename && project.render?.stored) {
  return serveR2Object(request, env, project.render.stored);
}

const format = ["vertical", "portrait", "square"].find(
  (name) => filename === `${project.render?.id}-${name}.mp4`
);

if (format && project.render?.storedOutputs?.[format]) {
  return serveR2Object(request, env, project.render.storedOutputs[format]);
}

return json({ message: "Video not found." }, 404);
}
      if (url.pathname.startsWith("/media/")) {
        const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
        const session = await studioSession(request, env);
        if (!session) return json({ message: "Media not found." }, 404);
        const owner = session.owner;
        if (parts.length !== 4 || safe(parts[1]) !== owner) return json({ message: "Media not found." }, 404);
        return await serveMedia(request, env, owner, safe(parts[2]), safe(parts[3]));
      }
      if (url.pathname.startsWith("/safe-music/")) {
        const trackId = safe(url.pathname.split("/").filter(Boolean)[1]);
        const track = await env.DB.prepare("SELECT stored FROM safe_music_tracks WHERE id = ? AND status = 'active'").bind(trackId).first();
        if (!track) return json({ message: "Track not found." }, 404);
        return await serveSafeMusic(request, env, track.stored);
      }
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(JSON.stringify({ message: "request failed", path: new URL(request.url).pathname, error: error instanceof Error ? error.message : String(error) }));
      return json({ message: error.message || "Unexpected server error." }, error.status || 500);
    }
  }
};
