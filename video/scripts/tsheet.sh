#!/bin/bash
# contact sheet at fixed interval (tile i = i*every seconds, row-major, 4 cols): tsheet.sh <video> <out.png> <every>
ffmpeg -y -v error -i "$1" -vf "fps=1/${3:-2},scale=480:-1,tile=4x4" -frames:v 1 "$2"
