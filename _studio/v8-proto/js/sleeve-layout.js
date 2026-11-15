// Screen-space slots shared by WebGL sleeves and their accessible hit targets.
// The disc's song/year geometry remains unchanged.
export function sleeveLayout(items, width, height, panelFraction = 0) {
  const gap = width <= 860 ? 14 : 18, padding = width <= 860 ? 20 : 36;
  const area = Math.max(1, width * (1 - panelFraction) - padding * 2);
  if (!items.length) return [];
  const maximum = Math.max(1, Math.min(items.length, Math.floor((area + gap) / ((width <= 400 ? 84 : 100) + gap))));
  const rows = Math.ceil(items.length / maximum), columns = Math.ceil(items.length / rows);
  const minTop = width <= 860 ? 150 : 190;
  const size = Math.min(items.length === 1 ? 176 : 148, (area - gap * (columns - 1)) / columns, (height - minTop - 12) / rows - 100);
  const rowHeight = size + 100;
  const top = Math.max(width <= 860 ? 150 : 190, Math.min(height * .58 - rows * rowHeight / 2, height - rows * rowHeight - 44));
  return items.map((item, i) => {
    const row = Math.floor(i / columns), col = i % columns, n = Math.min(columns, items.length - row * columns);
    const x = padding + (area - n * size - (n - 1) * gap) / 2 + col * (size + gap), y = top + row * rowHeight;
    const ratio = item.ratio || 1, imageWidth = size * Math.min(1, ratio), imageHeight = size * Math.min(1, 1 / ratio);
    return {id:item.id, x,y,width:size,height:rowHeight-12, columns,
      image:{x:x+(size-imageWidth)/2,y:y+size-imageHeight,width:imageWidth,height:imageHeight}};
  });
}
