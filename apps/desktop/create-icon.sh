#!/bin/bash
# Create a simple 1024x1024 PNG icon using Python
python3 << 'PYTHON'
from PIL import Image, ImageDraw, ImageFont
import os

# Create a 1024x1024 image with a simple design
img = Image.new('RGBA', (1024, 1024), (110, 53, 212, 255))  # Purple background
draw = ImageDraw.Draw(img)

# Draw a simple "C" letter
try:
    font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 600)
except:
    font = ImageFont.load_default()

# Draw "C" in white
draw.text((200, 150), "C", fill=(255, 255, 255, 255), font=font)

# Save as PNG
img.save('app-icon.png', 'PNG')
print("Created app-icon.png")
PYTHON
chmod +x create-icon.sh
bash create-icon.sh 2>&1 || echo "Python PIL not available, will use Tauri default"