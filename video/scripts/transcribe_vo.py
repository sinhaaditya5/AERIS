import json,sys
from faster_whisper import WhisperModel
m=WhisperModel("small.en",compute_type="int8")
import numpy as np
audio=np.fromfile("vo16k.f32",dtype=np.float32)
segs,_=m.transcribe(audio,word_timestamps=True,language="en")
out=[]
for s in segs:
    out.append({"start":s.start,"end":s.end,"text":s.text.strip(),"words":[{"w":w.word.strip(),"s":w.start,"e":w.end} for w in s.words]})
json.dump(out,open("transcript.json","w"),indent=1)
for s in out: print(f"{s['start']:7.2f} {s['end']:7.2f} {s['text']}")
