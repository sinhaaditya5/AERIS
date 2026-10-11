#!/bin/bash
# contact sheet: sheet.sh <video> <out.png> [n=8]
v="$1"; o="$2"; n="${3:-8}"
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$v")
fps=$(python3 -c "print($n/$d)")
ffmpeg -y -v error -i "$v" -vf "fps=$fps,scale=640:-1,tile=4x$(( (n+3)/4 ))" -frames:v 1 "$o"
echo "$v ${d}s"
