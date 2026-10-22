/** a profile picture, or a coloured monogram when there is none. the colour comes from the username so it is stable. */
export function UserAvatar({ username, name, src, size = 72 }: { username: string; name?: string; src?: string; size?: number }) {
  const label = (name || username).trim();
  const initials = label.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  let h = 0;
  for (const ch of username) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const style = { width: size, height: size, fontSize: size * 0.38 };
  if (src) return <img className="uavatar" src={src} alt="" style={style} />;
  return <span className="uavatar mono-av" aria-hidden style={{ ...style, background: `linear-gradient(145deg, hsl(${h} 70% 62%), hsl(${(h + 40) % 360} 65% 48%))` }}>{initials}</span>;
}

/** downscale to a square jpeg data url so it fits the api's request cap */
export function resizeToAvatar(file: File, px = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const c = document.createElement('canvas');
      c.width = c.height = px;
      c.getContext('2d')!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, px, px);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('that file is not an image the browser can read')); };
    img.src = url;
  });
}
