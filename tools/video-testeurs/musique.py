# musique de fond de la vidéo des testeurs : pop acoustique enjouée, 108 bpm, en sol majeur
# composition générée (pas d'échantillon ni d'œuvre existante) : libre de droits. Usage : python3 musique.py 95
import numpy as np, wave, sys
SR=44100; DUR=float(sys.argv[1]) if len(sys.argv)>1 else 95
n=int(SR*DUR)+SR; L=np.zeros(n); R=np.zeros(n)
BPM=108; b=60/BPM; BAR=4*b
rng=np.random.default_rng(3)
hz=lambda m:440*2**((m-69)/12)
def add(s,w,vol,pan=.5):
    i=int(s*SR)
    if i>=n: return
    w=w[:n-i]; L[i:i+len(w)]+=w*vol*(1-pan)*2*.5; R[i:i+len(w)]+=w*vol*pan*2*.5
def t_(d): return np.arange(int(d*SR))/SR
def kick(s,v=1):
    t=t_(.35); f=50+90*np.exp(-t*30); ph=2*np.pi*np.cumsum(f)/SR
    add(s,np.sin(ph)*np.exp(-t*9),.9*v)
def snare(s,v=1):
    t=t_(.22); w=rng.standard_normal(len(t))*np.exp(-t*18)+.4*np.sin(2*np.pi*190*t)*np.exp(-t*25)
    add(s,w,.28*v,.55)
def clap(s,v=1):
    t=t_(.2); e=np.exp(-t*30)
    for d in (0,.01,.02): add(s+d,rng.standard_normal(len(t))*e,.09*v,.45)
def hat(s,v=1,open_=False):
    t=t_(.25 if open_ else .05); w=rng.standard_normal(len(t)); w=np.diff(np.concatenate([[0],w]))
    add(s,w*np.exp(-t*(12 if open_ else 60)),.07*v,.65)
def shaker(s,v=1):
    t=t_(.08); w=rng.standard_normal(len(t))*np.sin(np.pi*np.minimum(t/.08,1)); add(s,w,.035*v,.35)
def bass(s,m,d,v=1):
    t=t_(d); f=hz(m); w=np.sin(2*np.pi*f*t)+.3*np.sin(4*np.pi*f*t)+.1*np.sign(np.sin(2*np.pi*f*t))
    e=np.minimum(t/.005,1)*np.exp(-t*2.2)*np.minimum((d-t)/.02,1); add(s,w*e,.32*v,.5)
def pluck(s,m,d=.6,v=1,pan=.5):
    t=t_(d); f=hz(m)
    w=np.sin(2*np.pi*f*t)+.5*np.sin(4*np.pi*f*t)*np.exp(-t*5)+.25*np.sin(6*np.pi*f*t)*np.exp(-t*9)+.1*np.sin(8*np.pi*f*t)*np.exp(-t*14)
    add(s,w*np.minimum(t/.003,1)*np.exp(-t*4.5),.11*v,pan)
def bell(s,m,d=1.2,v=1,pan=.5):
    t=t_(d); f=hz(m); w=np.sin(2*np.pi*f*t+1.2*np.sin(2*np.pi*f*3.5*t)*np.exp(-t*4))
    add(s,w*np.minimum(t/.004,1)*np.exp(-t*3),.13*v,pan)
def pad(s,ms,d,v=1):
    t=t_(d); w=0
    for m in ms:
        f=hz(m); w=w+np.sin(2*np.pi*f*t)+.4*np.sin(2*np.pi*f*1.004*t)+.2*np.sin(4*np.pi*f*.997*t)
    e=np.minimum(t/.4,1)*np.minimum((d-t)/.5,1); add(s,w*np.clip(e,0,1),.022*v,.5)
# accords (sol majeur) : G  D/F#  Em  C  |  refrain : C  G  D  Em
V=[(55,[55,59,62,66]),(50,[54,57,62,66]),(52,[52,55,59,62]),(48,[48,52,55,59])]
C=[(48,[48,52,55,62]),(55,[55,59,62,67]),(50,[50,54,57,62]),(52,[52,55,59,64])]
# plan : intro 4 mesures, couplet 8, refrain 8, pont 4, couplet 8, refrain 8, fin 2  ≈ 42 mesures ≈ 93 s
plan=['intro']*4+['A']*8+['B']*8+['pont']*4+['A2']*8+['B']*8+['fin']*2
hook=[74,76,74,71,69,71,74,0, 76,78,79,78,76,74,71,0]  # 2 mesures, croches (0 = silence)
hook2=[71,74,76,79,78,76,74,0, 74,76,78,81,79,78,79,0]
t=0
for k,sec in enumerate(plan):
    prog=C if sec=='B' else V
    root,ch=prog[k%4]
    bar_i=k
    # percussions
    if sec in('A','B','A2'):
        for q in range(4):
            if q in(0,2): kick(t+q*b)
            if sec!='A' and q==3 and k%2: kick(t+q*b+b/2,.6)
            if q in(1,3): (snare if sec=='B' else clap)(t+q*b)
            for e in range(2): hat(t+q*b+e*b/2,.9 if e else .6, open_=(sec=='B' and e==1 and q==3))
            for e in range(4): shaker(t+q*b+e*b/4,.7 if e%2 else .4)
    elif sec=='intro':
        for q in range(4): shaker(t+q*b+b/2,.5)
        if k==3:
            for e in range(8): snare(t+2*b+e*b/4,.2+e*.08)
    elif sec=='pont':
        kick(t); 
        for q in range(4): hat(t+q*b+b/2,.5)
        if k==plan.index('pont')+3:
            for e in range(8): snare(t+2*b+e*b/4,.2+e*.09)
    elif sec=='fin':
        if k==len(plan)-2: kick(t); snare(t); 
    # basse : fondamentale en croches syncopées
    if sec in('A','B','A2','pont'):
        rhythm=[(0,.7),(1.5,.4),(2,.7),(3,.3),(3.5,.4)] if sec!='pont' else [(0,3.5)]
        for (o,d) in rhythm: bass(t+o*b,root-12+(7 if (sec=='B' and o==3.5) else 0),d*b+.05)
    elif sec=='fin' and k==len(plan)-2: bass(t,43,3)
    # guitare/arpèges
    if sec!='fin' or k==len(plan)-2:
        pat=[0,2,1,3,2,1,3,2] if sec!='intro' else [0,2,1,3,0,2,1,3]
        for e,ix in enumerate(pat):
            if sec=='fin' and e>0: break
            pluck(t+e*b/2,ch[ix]+12,.7,.8 if e%2 else 1,.3+.4*(e%2))
    # nappe
    if sec in('B','pont','A2'): pad(t,ch,BAR+.2,1.2 if sec=='B' else .8)
    # mélodie (refrain : le motif ; couplet 2 : réponse plus discrète)
    if sec=='B':
        j=(k-plan.index('B'))%2; hk=hook if ((k//2)%2==0) else hook2
        for e in range(8):
            m=hk[j*8+e]
            if m: bell(t+e*b/2,m,.9,1,.55)
    if sec=='A2' and k%2==1:
        for e,m in enumerate([79,0,78,76,74,0,0,0]):
            if m: bell(t+e*b/2,m,.9,.6,.6)
    t+=BAR
# dernier accord tenu
pad(t-2*BAR,[55,59,62,67],2*BAR,1.3); bell(t-2*BAR,79,3,.8)
out=np.stack([L,R],1)
# écho léger
for dl,g in [(b*.75,.18),(b*1.5,.09)]:
    d=int(dl*SR); out[d:]+=out[:-d][:, ::-1]*g
out=out[:int(DUR*SR)]
fi=int(.3*SR); fo=int(3*SR)
out[:fi]*=np.linspace(0,1,fi)[:,None]; out[-fo:]*=np.linspace(1,0,fo)[:,None]**1.5
# compression douce
out=np.tanh(out/np.abs(out).max()*1.6); out/=np.abs(out).max()*1.1
w=wave.open('musique.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((out*32767).astype('<i2').tobytes()); w.close()
print('mesures',len(plan),'durée musique',len(plan)*BAR)
