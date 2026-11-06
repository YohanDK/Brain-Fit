// Dessine les blasons des provinces et les étendards des pays disparus de l'exercice « Sur la carte » (public/armoiries/*.svg).
// Tout est dessiné ici, à partir des blasonnements : aucun fichier repris d'ailleurs, donc aucun droit à céder.
// Usage : node tools/cartes/armoiries.js
'use strict';
const fs=require('fs'), path=require('path');
const out=path.join(__dirname,'..','..','public','armoiries'); fs.mkdirSync(out,{recursive:true});

// émaux
const OR='#E2B33C', ARGENT='#FBFAF5', GUEULES='#C8102E', AZUR='#1F4FA3', SINOPLE='#2E7D32', SABLE='#1E1E1E';
// l'écu français ancien : 100 × 120
const ECU='M4 4H96V66C96 96 74 110 50 117C26 110 4 96 4 66Z';
const ecu=(id,fond,...charges)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 121"><defs><clipPath id="c"><path d="${ECU}"/></clipPath>${DEFS}</defs><g clip-path="url(#c)"><rect width="100" height="121" fill="${fond}"/>${charges.join('')}</g><path d="${ECU}" fill="none" stroke="#3a2a10" stroke-width="2"/></svg>`;
const drapeau=(...charges)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 100"><defs>${DEFS}</defs>${charges.join('')}<rect width="150" height="100" fill="none" stroke="#3a2a10" stroke-opacity=".35" stroke-width="2"/></svg>`;

// meubles réutilisables
const DEFS=`<symbol id="lys" viewBox="-12 -14 24 28" overflow="visible"><path d="M0-13C4-8 5-3 2.4 3.5H-2.4C-5-3-4-8 0-13Z"/><path d="M-2.4 3.5C-7 4.5-11.5 1-11 -5C-9.5-1.5-7.5-1-5.6-2.2C-6.4 0.6-5 2.5-2.4 3.5Z"/><path d="M2.4 3.5C7 4.5 11.5 1 11 -5C9.5-1.5 7.5-1 5.6-2.2C6.4 0.6 5 2.5 2.4 3.5Z"/><rect x="-6.5" y="3.5" width="13" height="3" rx="1"/><path d="M-1.8 6.5C-2.5 10-5.5 12.5-8.5 11.5C-6 11-4 9-3.6 6.5ZM1.8 6.5C2.5 10 5.5 12.5 8.5 11.5C6 11 4 9 3.6 6.5ZM-1.4 6.5H1.4L0 12Z"/></symbol>`+
`<symbol id="her" viewBox="-6 -8 12 18" overflow="visible"><circle cx="0" cy="-6.4" r="1.5"/><circle cx="-2.9" cy="-4.6" r="1.3"/><circle cx="2.9" cy="-4.6" r="1.3"/><path d="M0-4.2C-.6 1-3 5-4.6 9L-1.4 7.4 0 9.6 1.4 7.4 4.6 9C3 5 .6 1 0-4.2Z"/></symbol>`;
const lys=(x,y,s=1,c=OR)=>`<use href="#lys" x="${x-12*s}" y="${y-14*s}" width="${24*s}" height="${28*s}" fill="${c}"/>`;
const her=(x,y,s=1)=>`<use href="#her" x="${x-6*s}" y="${y-8*s}" width="${12*s}" height="${18*s}" fill="${SABLE}"/>`;
const semeHermine=(s=1)=>{let r='';for(let j=0;j<6;j++)for(let i=0;i<5;i++){const x=12+i*19+(j%2?9.5:0), y=12+j*19;if(x<100)r+=her(x,y,s);}return r;};
const semeLys=()=>{let r='';for(let j=0;j<6;j++)for(let i=0;i<4;i++){const x=14+i*24+(j%2?12:0), y=14+j*20;if(x<100)r+=lys(x,y,.62);}return r;};
const troisLys=()=>lys(29,30,.95)+lys(71,30,.95)+lys(50,74,.95);
// bordure : l'écu tracé d'un trait large, rogné par l'écu lui-même
const bordure=(c,extra='')=>`<path d="${ECU}" fill="none" stroke="${c}" stroke-width="20" ${extra}/>`;
const componee=(a,b)=>bordure(a)+bordure(b,'stroke-dasharray="9 9"');
// bordure engrêlée : des demi-cercles du champ mordent le bord intérieur
const engrelee=(c,champ)=>bordure(c)+`<path d="M14 14H86V66C86 90 68 101 50 107C32 101 14 90 14 66Z" fill="none" stroke="${champ}" stroke-width="7" stroke-dasharray="0 7.6" stroke-linecap="round"/>`;
const pals=(n,c)=>{const w=100/(2*n+1);let r='';for(let i=0;i<n;i++)r+=`<rect x="${(2*i+1)*w}" width="${w}" height="121" fill="${c}"/>`;return r;};

const A={
  bretagne:ecu('bretagne',ARGENT,semeHermine(1.15)),
  limousin:ecu('limousin',ARGENT,semeHermine(.95),bordure(GUEULES)),
  provence:ecu('provence',OR,pals(4,GUEULES)),
  roussillon:ecu('roussillon',OR,pals(4,GUEULES)),
  // bandé d'or et d'azur de six pièces, à la bordure de gueules (Bourgogne ancien)
  bourgogne:ecu('bourgogne',OR,`<g transform="rotate(40 50 60)">${[0,1,2].map(i=>`<rect x="-60" y="${9+i*36+18}" width="220" height="18" fill="${AZUR}"/>`).join('')}</g>`,bordure(GUEULES)),
  anjou:ecu('anjou',AZUR,semeLys(),bordure(GUEULES)),
  touraine:ecu('touraine',AZUR,semeLys(),componee(ARGENT,GUEULES)),
  berry:ecu('berry',AZUR,lys(32,36,.85),lys(68,36,.85),lys(50,76,.85),engrelee(GUEULES,AZUR)),
  // d'azur à trois fleurs de lys d'or, au bâton de gueules péri en bande
  bourbonnais:ecu('bourbonnais',AZUR,troisLys(),`<rect x="22" y="53" width="56" height="7" rx="1" fill="${GUEULES}" transform="rotate(40 50 56)"/>`),
  savoie:ecu('savoie',GUEULES,`<rect x="40" width="20" height="121" fill="${ARGENT}"/><rect y="42" width="100" height="20" fill="${ARGENT}"/>`),
  // de gueules à la croix vidée, cléchée et pommetée d'or (croix occitane)
  languedoc:ecu('languedoc',GUEULES,`<path d="M43 22H57L53.5 47L79 43.5V60.5L53.5 57L57 84H43L46.5 57L21 60.5V43.5L46.5 47Z" fill="none" stroke="${OR}" stroke-width="4" stroke-linejoin="round"/><g fill="${OR}">${[[43,18],[50,15],[57,18],[43,88],[50,91],[57,88],[17,43.5],[14,52],[17,60.5],[83,43.5],[86,52],[83,60.5]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3.6"/>`).join('')}</g>`),
  // d'or au gonfanon de gueules frangé de sinople
  auvergne:ecu('auvergne',OR,`<path d="M24 26H76V64L67 84L59 64L50 84L41 64L33 84L24 64Z" fill="${GUEULES}"/><path d="M24 64L33 84L41 64L50 84L59 64L67 84L76 64" fill="none" stroke="${SINOPLE}" stroke-width="3"/><rect x="22" y="22" width="56" height="5" fill="#7a5a20"/>`),
  // d'azur à la bande d'argent côtoyée de deux cotices potencées et contre-potencées d'or
  champagne:ecu('champagne',AZUR,`<g transform="rotate(40 50 60)"><rect x="-40" y="52" width="180" height="16" fill="${ARGENT}"/>${[38,82].map(y=>`<rect x="-40" y="${y-2}" width="180" height="4" fill="${OR}"/>`+Array.from({length:13},(_,i)=>`<rect x="${-14+i*10}" y="${y-5}" width="4" height="10" fill="${OR}"/><rect x="${-17+i*10}" y="${i%2?y+3:y-7}" width="10" height="3" fill="${OR}"/>`).join('')).join('')}</g>`),
  // étendards
  rome:drapeau(`<rect width="150" height="100" fill="#8E1B1B"/><rect x="8" y="8" width="134" height="84" fill="none" stroke="${OR}" stroke-width="2"/><text x="75" y="63" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="36" font-weight="700" letter-spacing="3" fill="${OR}">SPQR</text>`),
  // les Paléologues : croix d'or cantonnée de quatre briquets (des « B » affrontés)
  byzance:drapeau(`<rect width="150" height="100" fill="${GUEULES}"/><rect x="69" width="12" height="100" fill="${OR}"/><rect y="44" width="150" height="12" fill="${OR}"/>`+[[37,36,1],[113,36,0],[37,90,1],[113,90,0]].map(([x,y,m])=>`<text x="0" y="0" transform="translate(${x} ${y}) scale(${m?-1:1} 1)" text-anchor="middle" font-family="Georgia,serif" font-size="34" font-weight="700" fill="${OR}">B</text>`).join('')),
  ottoman:drapeau(`<rect width="150" height="100" fill="#E30A17"/><circle cx="62" cy="50" r="25" fill="#fff"/><circle cx="69" cy="50" r="20" fill="#E30A17"/><path transform="translate(92 50) rotate(-18)" fill="#fff" d="M0-11L2.6-3.6 10.5-3.4 4.2 1.4 6.5 9 0 4.5-6.5 9-4.2 1.4-10.5-3.4-2.6-3.6Z"/>`),
  prusse:drapeau(`<rect width="150" height="50" fill="${SABLE}"/><rect y="50" width="150" height="50" fill="#fff"/>`),
  habsbourg:drapeau(`<rect width="150" height="50" fill="${SABLE}"/><rect y="50" width="150" height="50" fill="#F2C200"/>`),
  boheme:drapeau(`<rect width="150" height="50" fill="#fff"/><rect y="50" width="150" height="50" fill="${GUEULES}"/>`),
  // d'argent à la croix potencée d'or cantonnée de quatre croisettes du même
  jerusalem:drapeau(`<rect width="150" height="100" fill="#fff"/><g fill="${OR}"><rect x="69" y="16" width="12" height="68"/><rect x="41" y="44" width="68" height="12"/><rect x="61" y="12" width="28" height="8"/><rect x="61" y="80" width="28" height="8"/><rect x="37" y="36" width="8" height="28"/><rect x="105" y="36" width="8" height="28"/>${[[50,28],[100,28],[50,72],[100,72]].map(([x,y])=>`<rect x="${x-2}" y="${y-8}" width="4" height="16"/><rect x="${x-8}" y="${y-2}" width="16" height="4"/>`).join('')}</g>`),
  // la croix de Bourgogne : sautoir écoté de gueules sur champ d'argent
  croixbourgogne:drapeau(`<rect width="150" height="100" fill="#fff"/><g stroke="${GUEULES}" stroke-width="10" stroke-linecap="round"><path d="M20 10L130 90M130 10L20 90"/></g><g fill="${GUEULES}">${[[20,10,130,90],[130,10,20,90]].flatMap(([x0,y0,x1,y1],k)=>[.2,.36,.64,.8].map((t,i)=>{const x=x0+(x1-x0)*t,y=y0+(y1-y0)*t,a=Math.atan2(y1-y0,x1-x0)*180/Math.PI;return `<rect x="${x-3}" y="${y-(i%2?12:0)}" width="6" height="12" rx="1.5" transform="rotate(${a} ${x} ${y})"/>`;})).join('')}</g>`),
  // la bannière de France : d'azur à trois fleurs de lys d'or
  france:drapeau(`<rect width="150" height="100" fill="${AZUR}"/>`+lys(48,32,1.05)+lys(102,32,1.05)+lys(75,72,1.05)),
};
for(const[k,v] of Object.entries(A))fs.writeFileSync(path.join(out,k+'.svg'),v);
console.log(Object.keys(A).length,'armoiries écrites dans public/armoiries');
