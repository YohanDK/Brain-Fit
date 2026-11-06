# musique de fond composée pour Néophyte : arpèges doux sur nappe, 72 bpm, libre de droits (générée)
# python3 musique.py 95  → musique.wav (composition générée, sans droits d’auteur)
import numpy as np, wave, sys
SR=44100; DUR=float(sys.argv[1]) if len(sys.argv)>1 else 96
n=int(SR*DUR); out=np.zeros((n,2))
bpm=72; beat=60/bpm
def hz(m): return 440*2**((m-69)/12)
# progression (4 temps chacune) : Fmaj9 - C/E - Dm7 - Bb maj7 - ... en fa majeur, douce
prog=[[53,57,60,64,67],[52,55,60,64,67],[50,57,60,62,65],[46,53,57,62,65],
      [53,57,60,64,69],[52,55,59,64,67],[50,53,57,60,65],[48,55,60,64,67]]
def env(t,a,d):
    return np.minimum(t/a,1)*np.exp(-t/d)
def note(start,m,dur,vol,pan,kind):
    s=int(start*SR); L=int(dur*SR); 
    if s>=n: return
    L=min(L,n-s); t=np.arange(L)/SR; f=hz(m)
    if kind=='pluck':
        w=np.sin(2*np.pi*f*t)+.35*np.sin(4*np.pi*f*t)*np.exp(-t*3)+.12*np.sin(6*np.pi*f*t)*np.exp(-t*6)
        w*=env(t,.006,.9)
    else:
        w=(np.sin(2*np.pi*f*t)+.5*np.sin(2*np.pi*f*1.003*t)+.25*np.sin(4*np.pi*f*.998*t))
        a=np.minimum(t/1.2,1)*np.minimum((dur-t)/1.2,1); w*=np.clip(a,0,1)
    out[s:s+L,0]+=w*vol*(1-pan); out[s:s+L,1]+=w*vol*pan
bar=4*beat; t=0; i=0
rng=np.random.default_rng(7)
while t<DUR:
    ch=prog[i%len(prog)]
    for m in ch[:3]: note(t,m,bar+1.0,.035,.5,'pad')
    note(t,ch[0]-12,bar,.05,.5,'pad')
    patt=[0,2,3,4,2,3,1,4]
    if i>=1:
        for k,ix in enumerate(patt):
            m=ch[ix]+12; note(t+k*beat/2,m,2.0,.06 if k%2==0 else .045,.35+.3*(k%2),'pluck')
    if i>=4 and i%2==0:
        mel=ch[rng.integers(2,5)]+24; note(t+beat*1.5,mel,2.5,.03,.6,'pluck')
    t+=bar; i+=1
# petite réverbération (échos décroissants)
rev=out.copy()
for dl,g in [(0.113,.35),(0.197,.28),(0.293,.22),(0.41,.15),(0.53,.1)]:
    d=int(dl*SR); rev[d:]+=out[:-d][:, ::-1]*g
out=rev
# fondu d'entrée et de sortie
fi=int(2*SR); fo=int(4*SR)
out[:fi]*=np.linspace(0,1,fi)[:,None]; out[-fo:]*=np.linspace(1,0,fo)[:,None]
out/=np.abs(out).max()*1.12
w=wave.open('musique.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((out*32767).astype('<i2').tobytes()); w.close()
