// Keeping work. Two layers:
//   - an autosave slot, written on every change, restored on the next visit
//   - named projects the user saves deliberately
// Both live in this browser (localStorage). The JSON download is the copy that
// survives a cleared browser, and the UI says so.

const AUTO_KEY = 'apartment3d.autosave';
const LIST_KEY = 'apartment3d.projects';
const MAX_IMAGE = 1100;   // px on the longest edge when storing the source image

function safe(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}

export function available() {
  return safe(() => {
    const probe = '__a3d__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  }, false);
}

// Shrink the source image so a plan and its backdrop fit in a storage slot.
export function packImage(image) {
  if (!image) return null;
  return safe(() => {
    const scale = Math.min(1, MAX_IMAGE / Math.max(image.width, image.height));
    const c = document.createElement('canvas');
    c.width = Math.round(image.width * scale);
    c.height = Math.round(image.height * scale);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(image, 0, 0, c.width, c.height);
    return { url: c.toDataURL('image/jpeg', 0.72), width: image.width, height: image.height };
  });
}

export function unpackImage(packed) {
  if (!packed || !packed.url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = packed.url;
  });
}

function snapshot(plan, image, name) {
  return {
    format: 'apartment3d/1',
    savedAt: new Date().toISOString(),
    name: name || plan.name || 'Apartment',
    plan,
    image: image || null,
  };
}

// ------------------------------------------------------------------ autosave

export function writeAuto(plan, image) {
  return safe(() => {
    localStorage.setItem(AUTO_KEY, JSON.stringify(snapshot(plan, image)));
    return true;
  }, false);
}

export function readAuto() {
  return safe(() => {
    const raw = localStorage.getItem(AUTO_KEY);
    return raw ? JSON.parse(raw) : null;
  });
}

export function clearAuto() {
  safe(() => localStorage.removeItem(AUTO_KEY));
}

// ------------------------------------------------------------------ projects

export function list() {
  return safe(() => {
    const raw = localStorage.getItem(LIST_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return ids
      .map((id) => {
        const meta = safe(() => JSON.parse(localStorage.getItem(`${LIST_KEY}.${id}`)));
        return meta ? { id, name: meta.name, savedAt: meta.savedAt, rooms: (meta.plan.rooms || []).length } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
  }, []);
}

export function save(name, plan, image) {
  const id = `p_${Date.now().toString(36)}`;
  const payload = JSON.stringify(snapshot(plan, image, name));
  try {
    localStorage.setItem(`${LIST_KEY}.${id}`, payload);
    const ids = safe(() => JSON.parse(localStorage.getItem(LIST_KEY)) || [], []);
    ids.push(id);
    localStorage.setItem(LIST_KEY, JSON.stringify(ids));
    return { ok: true, id };
  } catch (err) {
    // usually the 5 MB quota, and usually because of the stored backdrop image
    safe(() => localStorage.removeItem(`${LIST_KEY}.${id}`));
    return { ok: false, error: quotaMessage(err) };
  }
}

export function load(id) {
  return safe(() => {
    const raw = localStorage.getItem(`${LIST_KEY}.${id}`);
    return raw ? JSON.parse(raw) : null;
  });
}

export function remove(id) {
  safe(() => {
    localStorage.removeItem(`${LIST_KEY}.${id}`);
    const ids = (JSON.parse(localStorage.getItem(LIST_KEY)) || []).filter((x) => x !== id);
    localStorage.setItem(LIST_KEY, JSON.stringify(ids));
  });
}

export function quotaMessage(err) {
  const name = err && err.name;
  if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
    return 'This browser is out of storage space. Delete a saved project, or use Save plan to download the file.';
  }
  return (err && err.message) || 'could not write to this browser';
}

export function usage() {
  return safe(() => {
    let bytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('apartment3d.')) bytes += (localStorage.getItem(key) || '').length;
    }
    return bytes;
  }, 0);
}
