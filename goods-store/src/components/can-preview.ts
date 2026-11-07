/** Visual design mockup only. Artwork keeps its aspect ratio on a generic can. */
export function renderCan(target:HTMLCanvasElement,art:HTMLCanvasElement,paper:string,stage:string){
 target.width=1200;target.height=1500;const c=target.getContext('2d');if(!c)throw new Error('Canvas unavailable');
 c.fillStyle=stage;c.fillRect(0,0,1200,1500);
 const shadow=c.createRadialGradient(600,1320,20,600,1320,350);shadow.addColorStop(0,'#00000040');shadow.addColorStop(1,'#00000000');c.save();c.translate(0,1050);c.scale(1,.22);c.fillStyle=shadow;c.fillRect(150,0,900,1900);c.restore();
 const left=335,top=210,width=530,height=1080;
 const texture=document.createElement('canvas');texture.width=1200;texture.height=2000;const t=texture.getContext('2d')!;t.fillStyle=paper;t.fillRect(0,0,1200,2000);
 const scale=Math.min(1200/art.width,2000/art.height);const w=art.width*scale,h=art.height*scale;t.drawImage(art,(1200-w)/2,(2000-h)/2,w,h);
 // A horizontal cylinder projection compresses the artwork toward each side.
 c.save();c.beginPath();c.roundRect(left,top,width,height,45);c.clip();
 for(let i=0;i<width;i++){const a=Math.asin((i/width)*2-1),b=Math.asin(((i+1)/width)*2-1);const sx=(a/Math.PI+.5)*1200,sw=(b-a)/Math.PI*1200;c.drawImage(texture,sx,0,Math.max(sw,1),2000,left+i,top,1.5,height)}
 const light=c.createLinearGradient(left,0,left+width,0);light.addColorStop(0,'#00000066');light.addColorStop(.16,'#00000008');light.addColorStop(.35,'#ffffff38');light.addColorStop(.55,'#ffffff00');light.addColorStop(.85,'#00000010');light.addColorStop(1,'#00000070');c.fillStyle=light;c.fillRect(left,top,width,height);c.restore();
 const metal=c.createLinearGradient(left,0,left+width,0);metal.addColorStop(0,'#727a7b');metal.addColorStop(.2,'#eff2f0');metal.addColorStop(.5,'#b6bdbb');metal.addColorStop(.75,'#fafbf9');metal.addColorStop(1,'#727a7b');
 c.fillStyle=metal;c.beginPath();c.ellipse(600,top+8,260,38,0,0,Math.PI*2);c.fill();c.strokeStyle='#6d7776';c.lineWidth=3;c.stroke();
 c.fillStyle='#bac1be';c.beginPath();c.ellipse(600,top+5,235,25,0,0,Math.PI*2);c.fill();
 c.strokeStyle='#737e7c';c.lineWidth=8;c.beginPath();c.ellipse(600,top+4,52,15,-.1,0,Math.PI*2);c.stroke();
 c.fillStyle=metal;c.beginPath();c.ellipse(600,top+height-9,254,26,0,0,Math.PI*2);c.fill();c.strokeStyle='#8e9894';c.lineWidth=3;c.stroke();
}
