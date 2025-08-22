export function timeAgo(timestamp: number): string {
  const now = Date.now();
  let delta = Math.floor((now - timestamp) / 1000);

  if (delta < 60) {
    return `${delta} second${delta !== 1 ? "s" : ""} ago`;
  }

  delta = Math.floor(delta / 60);
  if (delta < 60) {
    return `${delta} minute${delta !== 1 ? "s" : ""} ago`;
  }

  delta = Math.floor(delta / 60);
  if (delta < 24) {
    return `${delta} hour${delta !== 1 ? "s" : ""} ago`;
  }

  delta = Math.floor(delta / 24);
  if (delta < 30) {
    return `${delta} day${delta !== 1 ? "s" : ""} ago`;
  }

  delta = Math.floor(delta / 30);
  if (delta < 12) {
    return `${delta} month${delta !== 1 ? "s" : ""} ago`;
  }

  const years = Math.floor(delta / 12);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}