from pathlib import Path
import random

OUT = Path('public/assets/commercial/districts')


def defs() -> str:
    return '''<defs>
<linearGradient id="lot" x1="250" y1="450" x2="760" y2="700"><stop stop-color="#294a45"/><stop offset="1" stop-color="#122b28"/></linearGradient>
<filter id="soft"><feGaussianBlur stdDeviation="10"/></filter>
<style>.cyan{fill:#77d9eb}.warm{fill:#ffd77a}.off{fill:#32434b}</style>
</defs>'''


def iso(x: int, y: int, width: int, height: int, depth: int, left: str, right: str, top: str, lit: bool, seed: int) -> str:
    random.seed(seed)
    dx = width / 2
    dy = depth / 2
    A = (x - dx, y - dy - height)
    B = (x, y - depth - height)
    C = (x + dx, y - dy - height)
    D = (x, y - height)
    a = (x - dx, y - dy)
    c = (x + dx, y - dy)
    d = (x, y)
    shapes = [
        f'<polygon points="{A[0]},{A[1]} {D[0]},{D[1]} {d[0]},{d[1]} {a[0]},{a[1]}" fill="{left}"/>',
        f'<polygon points="{C[0]},{C[1]} {D[0]},{D[1]} {d[0]},{d[1]} {c[0]},{c[1]}" fill="{right}"/>',
        f'<polygon points="{A[0]},{A[1]} {B[0]},{B[1]} {C[0]},{C[1]} {D[0]},{D[1]}" fill="{top}" stroke="#a4edf4" stroke-opacity=".12"/>'
    ]
    rows = max(2, min(6, int(height / 38)))
    cols = max(2, min(4, int(width / 34)))
    for row in range(rows):
        for column in range(cols):
            if random.random() > .68:
                continue
            yy = (row + 1) / (rows + 1)
            xx = (column + 1) / (cols + 1)
            lx = A[0] + (D[0] - A[0]) * xx
            ly = A[1] + (D[1] - A[1]) * xx
            lb = a[0] + (d[0] - a[0]) * xx
            lby = a[1] + (d[1] - a[1]) * xx
            wx = lx + (lb - lx) * yy
            wy = ly + (lby - ly) * yy
            color = '#ffd77a' if lit and random.random() < .35 else ('#79dced' if lit else '#344852')
            shapes.append(f'<rect x="{wx-5:.1f}" y="{wy-3:.1f}" width="10" height="6" rx="1.4" fill="{color}" opacity="{.92 if lit else .45}"/>')
            rx = C[0] + (D[0] - C[0]) * xx
            ry = C[1] + (D[1] - C[1]) * xx
            rb = c[0] + (d[0] - c[0]) * xx
            rby = c[1] + (d[1] - c[1]) * xx
            wx = rx + (rb - rx) * yy
            wy = ry + (rby - ry) * yy
            shapes.append(f'<rect x="{wx-5:.1f}" y="{wy-3:.1f}" width="10" height="6" rx="1.4" fill="{color}" opacity="{.76 if lit else .36}"/>')
    return ''.join(shapes)


def tree(x: int, y: int, scale: float = 1) -> str:
    return f'<rect x="{x-2*scale}" y="{y-15*scale}" width="{4*scale}" height="{16*scale}" fill="#443326"/><circle cx="{x}" cy="{y-20*scale}" r="{11*scale}" fill="#3f7c5a"/><circle cx="{x-5*scale}" cy="{y-25*scale}" r="{7*scale}" fill="#56a073" opacity=".8"/>'


def asset(kind: str, blackout: bool = False) -> str:
    lit = not blackout
    svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768" viewBox="0 0 1024 768" fill="none">', defs()]
    lot_color = '#202a2d' if blackout else 'url(#lot)'
    svg.append('<ellipse cx="512" cy="648" rx="265" ry="62" fill="#02080b" opacity=".42" filter="url(#soft)"/>')
    svg.append(f'<polygon points="512,405 790,548 512,690 234,548" fill="{lot_color}" opacity=".82" stroke="#{"b94b61" if blackout else "4b8076"}" stroke-opacity=".35"/>')
    svg.append('<path d="M285 558L500 449L742 571" stroke="#10191d" stroke-width="34" stroke-linecap="round"/><path d="M285 558L500 449L742 571" stroke="#34464b" stroke-width="22" stroke-linecap="round" opacity=".88"/>')

    if kind == 'residential':
        colors = ('#16343e', '#245467', '#55a3b9') if lit else ('#1a252a', '#26343a', '#3b4a4f')
        specs = [(350, 590, 105, 185, 52), (470, 548, 120, 250, 58), (610, 590, 105, 190, 52), (400, 650, 90, 110, 45), (545, 635, 95, 135, 48), (680, 645, 82, 105, 42)]
        for index, spec in enumerate(specs): svg.append(iso(*spec, *colors, lit, index + 10))
        svg.extend([tree(300, 630, .8), tree(735, 625, .9), tree(585, 675, .65)])
    elif kind == 'commercial':
        colors = ('#142f45', '#23536f', '#67c9e6') if lit else ('#17242c', '#24343d', '#3b4b52')
        specs = [(350, 620, 105, 230, 54), (475, 560, 125, 320, 62), (610, 610, 112, 260, 56), (700, 650, 82, 140, 42), (420, 665, 90, 125, 44)]
        for index, spec in enumerate(specs): svg.append(iso(*spec, *colors, lit, index + 30))
        if lit: svg.append('<path d="M310 641L470 565L660 646" stroke="#7fe6ff" stroke-width="4" opacity=".55"/><circle cx="475" cy="548" r="12" fill="#ffcf63" opacity=".9"/>')
    elif kind == 'industrial':
        colors = ('#342d2a', '#594038', '#b87550') if lit else ('#242326', '#302d31', '#493e3e')
        specs = [(340, 630, 150, 95, 66), (520, 600, 175, 115, 72), (680, 645, 140, 88, 62), (430, 685, 125, 62, 54)]
        for index, spec in enumerate(specs): svg.append(iso(*spec, *colors, lit, index + 50))
        for x, y, height in [(390, 520, 150), (560, 500, 175), (690, 540, 130)]:
            svg.append(f'<rect x="{x-14}" y="{y-height}" width="28" height="{height}" fill="#3b474a"/><ellipse cx="{x}" cy="{y-height}" rx="14" ry="6" fill="#8b5542"/><rect x="{x-14}" y="{y-height+28}" width="28" height="16" fill="#dbe5e0" opacity=".65"/>')
    elif kind == 'public':
        colors = ('#214247', '#376b68', '#7cbba5') if lit else ('#1d292c', '#2b393b', '#445452')
        svg.append(iso(500, 620, 190, 145, 78, *colors, lit, 70))
        svg.append(iso(340, 660, 115, 88, 52, *colors, lit, 71))
        svg.append(iso(675, 660, 115, 88, 52, *colors, lit, 72))
        svg.append('<polygon points="500,402 548,430 500,458 452,430" fill="#8fcbb5" opacity=".9"/><rect x="488" y="355" width="24" height="58" fill="#456e69"/><circle cx="500" cy="345" r="14" fill="#7fe1dc" opacity=".7"/>')
        svg.extend([tree(280, 650, .8), tree(750, 650, .8), tree(590, 680, .65)])
    else:
        colors = ('#302b30', '#4c3943', '#a06e70') if lit else ('#211f23', '#302a30', '#493b40')
        specs = [(315, 635, 95, 120, 46), (410, 600, 105, 155, 50), (520, 635, 100, 125, 48), (625, 600, 105, 150, 50), (710, 650, 85, 105, 42), (390, 680, 82, 88, 40), (585, 682, 82, 90, 40)]
        for index, spec in enumerate(specs): svg.append(iso(*spec, *colors, lit, index + 90))
        svg.append('<path d="M310 648L500 552L720 660" stroke="#6a5158" stroke-width="5" opacity=".45"/>')

    if blackout:
        svg.append('<circle cx="512" cy="505" r="10" fill="#ff5d73"/><circle cx="512" cy="505" r="38" fill="#ff5d73" opacity=".08"/><path d="M480 505h64" stroke="#ff5d73" stroke-width="4" stroke-dasharray="8 7"/>')
    svg.append('</svg>')
    return ''.join(svg)


for district in ['residential', 'commercial', 'industrial', 'public', 'old_town']:
    directory = OUT / district
    directory.mkdir(parents=True, exist_ok=True)
    (directory / 'night.svg').write_text(asset(district, False), encoding='utf-8')
    (directory / 'blackout.svg').write_text(asset(district, True), encoding='utf-8')

(OUT / 'shadow.svg').write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768" viewBox="0 0 1024 768"><defs><filter id="b"><feGaussianBlur stdDeviation="18"/></filter></defs><ellipse cx="512" cy="648" rx="250" ry="54" fill="#02080b" opacity=".42" filter="url(#b)"/></svg>',
    encoding='utf-8'
)
