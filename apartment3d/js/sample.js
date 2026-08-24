// A synthetic floor plan drawn to a canvas, used for the "Load sample plan"
// button. It is deliberately noisy — labels, dimension lines and furniture
// symbols — so it exercises the same code path as a real upload.

export function sampleFloorPlan() {
  const PPM = 62;                     // pixels per metre in the drawing
  const M = 46;                       // margin
  const W = Math.round(11 * PPM) + M * 2;
  const H = Math.round(7.6 * PPM) + M * 2;

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  const X = (m) => M + m * PPM;
  const Y = (m) => M + m * PPM;

  const wall = (x1, y1, x2, y2, thick = 0.2) => {
    ctx.strokeStyle = '#111';
    ctx.lineWidth = thick * PPM;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(X(x1), Y(y1));
    ctx.lineTo(X(x2), Y(y2));
    ctx.stroke();
  };

  // outer shell
  wall(0, 0, 11, 0, 0.26);
  wall(0, 7.6, 11, 7.6, 0.26);
  wall(0, 0, 0, 7.6, 0.26);
  wall(11, 0, 11, 7.6, 0.26);

  // interior partitions, drawn with gaps where the doorways are
  wall(6.4, 0, 6.4, 2.0, 0.14);
  wall(6.4, 2.9, 6.4, 7.6, 0.14);

  wall(6.4, 3.8, 9.4, 3.8, 0.14);
  wall(10.3, 3.8, 11, 3.8, 0.14);

  wall(0, 5.2, 2.0, 5.2, 0.14);
  wall(2.9, 5.2, 6.4, 5.2, 0.14);

  wall(3.0, 5.2, 3.0, 6.4, 0.14);
  wall(3.0, 7.3, 3.0, 7.6, 0.14);

  // --- noise the tracer has to ignore -------------------------------------
  ctx.strokeStyle = '#8a8a8a';
  ctx.lineWidth = 1.2;

  // door swing arcs
  const arc = (cx, cy, r, a0, a1) => {
    ctx.beginPath();
    ctx.arc(X(cx), Y(cy), r * PPM, a0, a1);
    ctx.stroke();
  };
  arc(6.4, 2.9, 0.9, -Math.PI / 2, 0);
  arc(9.4, 3.8, 0.9, 0, Math.PI / 2);
  arc(2.0, 5.2, 0.9, 0, Math.PI / 2);

  // furniture symbols
  const rect = (x, y, w, h) => {
    ctx.strokeRect(X(x), Y(y), w * PPM, h * PPM);
  };
  rect(0.4, 0.4, 2.2, 0.9);      // sofa
  rect(3.6, 1.4, 1.4, 0.8);      // table
  rect(7.0, 0.3, 3.2, 0.6);      // kitchen run
  rect(7.0, 4.3, 1.6, 2.0);      // bed
  rect(0.35, 5.6, 1.4, 1.9);     // bed
  ctx.beginPath();
  ctx.arc(X(9.9), Y(5.4), 0.3 * PPM, 0, Math.PI * 2);   // basin
  ctx.stroke();

  // dimension lines
  ctx.strokeStyle = '#b0b0b0';
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(X(0), Y(-0.45));
  ctx.lineTo(X(11), Y(-0.45));
  ctx.stroke();
  ctx.setLineDash([]);

  // room labels
  ctx.fillStyle = '#444';
  ctx.font = `${Math.round(0.26 * PPM)}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = 'center';
  const text = (t, x, y) => ctx.fillText(t, X(x), Y(y));
  text('LIVING ROOM', 3.2, 2.8);
  text('KITCHEN', 8.7, 2.0);
  text('BEDROOM', 8.7, 5.8);
  text('BEDROOM', 1.5, 6.6);
  text('BATH', 4.7, 6.6);
  ctx.font = `${Math.round(0.2 * PPM)}px Helvetica, Arial, sans-serif`;
  ctx.fillStyle = '#888';
  text('11.00 m', 5.5, -0.65);
  text('SCALE 1:50', 9.6, 7.35);

  return canvasToImage(c);
}

export function canvasToImage(canvas) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = canvas.toDataURL('image/png');
  });
}
