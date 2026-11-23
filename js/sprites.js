/* ============================================================
   16×16 像素对手立绘（纯代码绘制，无外部图片）
   # = 描边   A = 本体   B = 阴影   C = 眼睛/发光   D = 暗部
   ============================================================ */
var SPRITES = {
  colossus: {
    palette: { '#': '#0d0912', A: '#8f94a3', B: '#5f6473', C: '#ffd166', D: '#b3862f' },
    pixels: [
      '................',
      '....########....',
      '...##AAAAAA##...',
      '..#AAAAAAAAAA#..',
      '..#A##A##A##A#..',
      '..#ACCA##ACCA#..',
      '..#AAAAAAAAAA#..',
      '..#AAA####AAA#..',
      '..#AAAAAAAAAA#..',
      '.#AAAAAAAAAAAA#.',
      '.#AAABAAAAABAA#.',
      '.#AAABAAAAABAA#.',
      '.#AAA######AAA#.',
      '..###..##..###..',
      '................',
      '................'
    ]
  },
  witch: {
    palette: { '#': '#0d0912', A: '#6f51a8', B: '#3b2a5e', C: '#7ef0d0', D: '#2f8f7a' },
    pixels: [
      '.......##.......',
      '......#AA#......',
      '.....#AAAA#.....',
      '....#AAAAAA#....',
      '....#ACCCCA#....',
      '....#AAAAAA#....',
      '...#AAAAAAAA#...',
      '...#A#####A#....',
      '...#A#BBB#A#....',
      '...#A#BBB#A#....',
      '...#A#####A#....',
      '....#AAAAAA#....',
      '.....#AAAA#.....',
      '.....#A##A#.....',
      '.....#A..A#.....',
      '....###..###....'
    ]
  },
  wolf: {
    palette: { '#': '#0d0912', A: '#8b5e3c', B: '#5e3f28', C: '#ffcc33', D: '#b8862b' },
    pixels: [
      '................',
      '..#..........#..',
      '..##........##..',
      '..#A#......#A#..',
      '..#AA#....#AA#..',
      '..#AAA####AAA#..',
      '..#AAAAAAAAAA#..',
      '..#ACCA##ACCA#..',
      '..#AAAAAAAAAA#..',
      '..#AAA####AAA#..',
      '...#AA#..#AA#...',
      '...#AA#..#AA#...',
      '...#AA#..#AA#...',
      '..#AAA#..#AAA#..',
      '..####....####..',
      '................'
    ]
  },
  warden: {
    palette: { '#': '#0d0912', A: '#5d7a8c', B: '#3d5566', C: '#ffe28a', D: '#b08a3e' },
    pixels: [
      '................',
      '....########....',
      '...#AAAAAAAA#...',
      '...#A##AA##A#...',
      '...#ACCAACCA#...',
      '...#AAAAAAAA#...',
      '..#AAAAAAAAAA#..',
      '..#A########A#..',
      '..#ABBBBBBBBA#..',
      '..#ABBBBBBBBA#..',
      '..#A########A#..',
      '..#AAAAAAAAAA#..',
      '...#AAAAAAAA#...',
      '....########....',
      '................',
      '................'
    ]
  },
  wraith: {
    palette: { '#': '#0d0912', A: '#7fd6c8', B: '#4a9c92', C: '#e6fffb', D: '#2f6f68' },
    pixels: [
      '................',
      '......####......',
      '.....#AAAA#.....',
      '....#AAAAAA#....',
      '...#AAAAAAAA#...',
      '...#AAAAAAAA#...',
      '...#ACCAACCA#...',
      '...#AAAAAAAA#...',
      '...#AAAAAAAA#...',
      '..#AAAAAAAAAA#..',
      '..#AAAAAAAAAA#..',
      '..#AAAAAAAAAA#..',
      '..#A#A#A#A#AA#..',
      '...#.#.#.#.#....',
      '................',
      '................'
    ]
  }
};

function drawPixelSprite(canvas, sprite) {
  if (!canvas || !sprite) return;
  var ctx = canvas.getContext('2d');
  var w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  for (var y = 0; y < sprite.pixels.length && y < h; y++) {
    var row = sprite.pixels[y];
    for (var x = 0; x < row.length && x < w; x++) {
      var ch = row[x];
      if (ch === '.') continue;
      var color = sprite.palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}
