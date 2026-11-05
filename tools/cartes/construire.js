// Dessine les deux fonds de carte de l'exercice « Sur la carte » à partir de Natural Earth (domaine public, naturalearthdata.com)
// et écrit public/cartes.js. Rien n'est chargé depuis un serveur de tuiles : la carte est un simple dessin SVG.
// Usage : node tools/cartes/construire.js <dossier des .geojson>
// Fichiers attendus (github.com/nvkelso/natural-earth-vector, dossier geojson) :
//   ne_10m_land, ne_10m_admin_0_countries, ne_10m_admin_0_boundary_lines_land, ne_10m_rivers_lake_centerlines, ne_10m_lakes,
//   ne_50m_land, ne_50m_admin_0_boundary_lines_land, ne_50m_lakes
'use strict';
const fs=require('fs'), path=require('path');
const dir=process.argv[2]; if(!dir){console.error('Indique le dossier des fichiers Natural Earth.');process.exit(1);}
const lire=f=>JSON.parse(fs.readFileSync(path.join(dir,f+'.geojson'),'utf8')).features;

// projection équirectangulaire : x = (lon - lon0) × c × k, y = (lat1 - lat) × k ; c corrige l'écrasement des longitudes en France.
// L'appli refait le même calcul (et son inverse) avec les paramètres écrits dans cartes.js.
const cosd=d=>Math.cos(d*Math.PI/180);
const P={fr:{lon0:-5.6,lat1:51.3,c:+cosd(46.25).toFixed(4),k:74},monde:{lon0:-180,lat1:84,c:1,k:+(1000/360).toFixed(6)}};
P.fr.w=Math.round((10-P.fr.lon0)*P.fr.c*P.fr.k); P.fr.h=Math.round((P.fr.lat1-41.2)*P.fr.k);
P.monde.w=1000; P.monde.h=Math.round((84+58)*P.monde.k);
const proj=(carte,lat,lon)=>{const q=P[carte];return[(lon-q.lon0)*q.c*q.k,(q.lat1-lat)*q.k];};

// Douglas-Peucker sur une suite de points [x,y] déjà projetés
function simplifier(pts,tol){
  if(pts.length<3)return pts;
  const garde=new Uint8Array(pts.length); garde[0]=garde[pts.length-1]=1;
  const pile=[[0,pts.length-1]];
  while(pile.length){
    const [a,b]=pile.pop(); let dmax=0,imax=-1;
    const [ax,ay]=pts[a],[bx,by]=pts[b], dx=bx-ax, dy=by-ay, L=Math.hypot(dx,dy);
    for(let i=a+1;i<b;i++){const d=L?Math.abs(dy*pts[i][0]-dx*pts[i][1]+bx*ay-by*ax)/L:Math.hypot(pts[i][0]-ax,pts[i][1]-ay);if(d>dmax){dmax=d;imax=i;}}
    if(dmax>tol){garde[imax]=1;pile.push([a,imax],[imax,b]);}
  }
  return pts.filter((_,i)=>garde[i]);
}
// découpe d'un anneau par un rectangle (Sutherland-Hodgman)
function couper(ring,[x0,y0,x1,y1]){
  const bords=[[p=>p[0]>=x0,(a,b)=>[x0,a[1]+(x0-a[0])/(b[0]-a[0])*(b[1]-a[1])]],
    [p=>p[0]<=x1,(a,b)=>[x1,a[1]+(x1-a[0])/(b[0]-a[0])*(b[1]-a[1])]],
    [p=>p[1]>=y0,(a,b)=>[a[0]+(y0-a[1])/(b[1]-a[1])*(b[0]-a[0]),y0]],
    [p=>p[1]<=y1,(a,b)=>[a[0]+(y1-a[1])/(b[1]-a[1])*(b[0]-a[0]),y1]]];
  let out=ring;
  for(const[dedans,inter] of bords){
    const src=out; out=[]; if(!src.length)break;
    for(let i=0;i<src.length;i++){
      const cur=src[i], prev=src[(i+src.length-1)%src.length];
      if(dedans(cur)){if(!dedans(prev))out.push(inter(prev,cur));out.push(cur);}
      else if(dedans(prev))out.push(inter(prev,cur));
    }
  }
  return out;
}
// tracé compact : premier point absolu, puis déplacements relatifs au dixième de pixel
function tracer(pts,ferme){
  const q=pts.map(p=>[Math.round(p[0]*10),Math.round(p[1]*10)]); let s='M'+q[0][0]/10+' '+q[0][1]/10+'l', n=0;
  for(let i=1;i<q.length;i++){const dx=(q[i][0]-q[i-1][0])/10, dy=(q[i][1]-q[i-1][1])/10;if(!dx&&!dy)continue;s+=(dx<0||!n?'':' ')+dx+(dy<0?'':' ')+dy;n++;}
  return n?s+(ferme?'z':''):'';
}
const polys=g=>g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
const lignes=g=>g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'?g.coordinates:[];

function surfaces(features,carte,tol,filtre){
  const C=P[carte], cadre=[-20,-20,C.w+20,C.h+20]; let d='';
  for(const f of features){
    if(filtre&&!filtre(f.properties))continue;
    for(const poly of polys(f.geometry))for(const ring of poly){
      let pts=couper(ring.map(([lon,lat])=>proj(carte,lat,lon)),cadre); if(pts.length<3)continue;
      const m=pts.length>>1; pts=simplifier(pts.slice(0,m+1),tol).concat(simplifier(pts.slice(m),tol).slice(1));
      const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1]);
      if(pts.length<4||(Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys))<tol*tol*6)continue; // îlots invisibles
      d+=tracer(pts,true);
    }
  }
  return d;
}
function traits(features,carte,tol,filtre){
  const C=P[carte]; let d='';
  for(const f of features){
    if(filtre&&!filtre(f.properties))continue;
    for(const l of lignes(f.geometry)){
      let seg=[];
      const fin=()=>{if(seg.length>1)d+=tracer(simplifier(seg,tol));seg=[];};
      for(const[lon,lat] of l){const p=proj(carte,lat,lon);if(p[0]>-10&&p[0]<C.w+10&&p[1]>-10&&p[1]<C.h+10)seg.push(p);else fin();}
      fin();
    }
  }
  return d;
}

const iso=p=>p.ADM0_A3||p.ISO_A3;
const FLEUVES=new Set(['Seine','Loire','Rhône','Rhne','Garonne','Dordogne','Rhin','Rhein','Rhine','Marne','Yonne','Mosel','Maas','Saône','Sane','Doubs','Vienne','Tarn','Durance','Ariège']);
const T={fr:+(process.env.TOL_FR||.4),monde:+(process.env.TOL_MONDE||.15)};
const C={
  fr:{
    terre:surfaces(lire('ne_10m_land'),'fr',T.fr),
    france:surfaces(lire('ne_10m_admin_0_countries'),'fr',T.fr,p=>iso(p)==='FRA'),
    frontieres:traits(lire('ne_10m_admin_0_boundary_lines_land'),'fr',T.fr),
    lacs:surfaces(lire('ne_10m_lakes'),'fr',T.fr,p=>(p.scalerank||0)<=6),
    fleuves:traits(lire('ne_10m_rivers_lake_centerlines'),'fr',T.fr,p=>FLEUVES.has(p.name))
  },
  monde:{
    terre:surfaces(lire('ne_50m_land'),'monde',T.monde),
    frontieres:traits(lire('ne_50m_admin_0_boundary_lines_land'),'monde',T.monde),
    lacs:surfaces(lire('ne_50m_lakes'),'monde',T.monde,p=>(p.scalerank||0)<=2)
  }
};
C.fr.proj={lon0:P.fr.lon0,lat1:P.fr.lat1,c:P.fr.c,k:P.fr.k,w:P.fr.w,h:P.fr.h};
C.monde.proj={lon0:P.monde.lon0,lat1:P.monde.lat1,c:1,k:P.monde.k,w:P.monde.w,h:P.monde.h};
const out=`// Fonds de carte de l'exercice « Sur la carte ». Données : Natural Earth (domaine public), naturalearthdata.com.
// Fichier produit par tools/cartes/construire.js : ne pas modifier à la main.
(function(root){root.NEO_CARTES=${JSON.stringify(C).replace(/,"/g,',\n"')};})(typeof window!=='undefined'?window:globalThis);
`;
fs.writeFileSync(path.join(__dirname,'..','..','public','cartes.js'),out);
const ko=o=>Math.round(Object.values(o).filter(v=>typeof v==='string').join('').length/1024);
console.log('public/cartes.js :',Math.round(out.length/1024),'Ko (France',ko(C.fr),'Ko, monde',ko(C.monde),'Ko)');
