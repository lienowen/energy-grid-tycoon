from pathlib import Path
import re

path = Path('public/assets/commercial/environment/dawn-city-base.svg')
svg = path.read_text()

road_block = '''<path d="M170 326 L292 356 L420 390 L554 410 L690 430 L826 410" class="r-o" stroke-width="18"/><path d="M170 326 L292 356 L420 390 L554 410 L690 430 L826 410" class="r-s" stroke-width="12"/><path d="M170 326 L292 356 L420 390 L554 410 L690 430 L826 410" class="r-c" stroke-width="0.9"/><path d="M334 252 L452 268 L574 286 L684 320 L780 376" class="r-o" stroke-width="16"/><path d="M334 252 L452 268 L574 286 L684 320 L780 376" class="r-s" stroke-width="10"/><path d="M334 252 L452 268 L574 286 L684 320 L780 376" class="r-c" stroke-width="0.8"/><path d="M278 438 L396 464 L516 500 L638 544" class="r-o" stroke-width="16"/><path d="M278 438 L396 464 L516 500 L638 544" class="r-s" stroke-width="10"/><path d="M278 438 L396 464 L516 500 L638 544" class="r-c" stroke-width="0.8"/><path d="M420 390 L454 334 L480 286" class="r-o" stroke-width="11"/><path d="M420 390 L454 334 L480 286" class="r-s" stroke-width="7"/><path d="M420 390 L454 334 L480 286" class="r-c" stroke-width="0.55"/><path d="M554 410 L604 360 L650 308" class="r-o" stroke-width="11"/><path d="M554 410 L604 360 L650 308" class="r-s" stroke-width="7"/><path d="M554 410 L604 360 L650 308" class="r-c" stroke-width="0.55"/><path d="M516 500 L536 454 L554 410" class="r-o" stroke-width="11"/><path d="M516 500 L536 454 L554 410" class="r-s" stroke-width="7"/><path d="M516 500 L536 454 L554 410" class="r-c" stroke-width="0.55"/>'''

pattern = re.compile(r'<path d="M358\.4 249\.6.*?(?=<polygon points="556\.8,304\.0)', re.S)
svg, count = pattern.subn(road_block, svg, count=1)
if count != 1:
    raise RuntimeError(f'road block replacement failed: {count}')

path.write_text(svg)
Path('scripts/apply-commercial-v11.py').unlink()
print('V11 road hierarchy applied')
