/** Generic visual mockup, not a production dieline or colour proof. */
export function renderCan(target:HTMLCanvasElement,art:HTMLCanvasElement,paper:string,stage:string,fit:'contain'|'cover'='cover'){
 target.width=1200;target.height=1500;const c=target.getContext('2d');if(!c)throw new Error('Canvas unavailable');
 c.fillStyle=stage;c.fillRect(0,0,1200,1500);
 const ambient=c.createRadialGradient(450,350,50,600,700,1000);ambient.addColorStop(0,'#ffffff88');ambient.addColorStop(1,'#00000014');c.fillStyle=ambient;c.fillRect(0,0,1200,1500);
 c.save();c.translate(600,1328);c.scale(1,.17);const shadow=c.createRadialGradient(0,0,25,0,0,360);shadow.addColorStop(0,'#17201e66');shadow.addColorStop(1,'#17201e00');c.fillStyle=shadow;c.fillRect(-400,-400,800,800);c.restore();
 const left=335,top=252,width=530,height=1010;
 const metal=c.createLinearGradient(left,0,left+width,0);[[0,'#68716f'],[.08,'#b8c1bd'],[.24,'#f5f7f2'],[.45,'#aab5af'],[.67,'#e8ede7'],[.88,'#b2bcb7'],[1,'#636e69']].forEach(([p,s])=>metal.addColorStop(p as number,s as string));
 // Tapered shoulder and rolled bottom, rather than a straight cylinder with flat caps.
 const body=new Path2D();body.moveTo(376,207);body.bezierCurveTo(375,237,335,244,335,288);body.lineTo(335,1237);body.bezierCurveTo(335,1285,359,1306,384,1310);body.quadraticCurveTo(600,1344,816,1310);body.bezierCurveTo(841,1306,865,1285,865,1237);body.lineTo(865,288);body.bezierCurveTo(865,244,825,237,824,207);body.closePath();c.fillStyle=metal;c.fill(body);
 const texture=document.createElement('canvas');texture.width=1200;texture.height=2000;const t=texture.getContext('2d')!;t.fillStyle=paper;t.fillRect(0,0,1200,2000);
 const scale=(fit==='cover'?Math.max:Math.min)(1200/art.width,2000/art.height);const w=art.width*scale,h=art.height*scale;t.drawImage(art,(1200-w)/2,(2000-h)/2,w,h);
 c.save();c.clip(body);
 // Printed artwork reaches the shoulder and heel. No artificial top/bottom bands in cover mode.
 for(let i=0;i<width;i++){const a=Math.asin(i/width*2-1),b=Math.asin((i+1)/width*2-1);c.drawImage(texture,(a/Math.PI+.5)*1200,0,Math.max((b-a)/Math.PI*1200,1),2000,left+i,top,1.5,height)}
 const light=c.createLinearGradient(left,0,left+width,0);[[0,'#00000077'],[.07,'#00000025'],[.22,'#ffffff08'],[.32,'#ffffff50'],[.42,'#ffffff12'],[.65,'#00000000'],[.86,'#0000001f'],[1,'#00000088']].forEach(([p,s])=>light.addColorStop(p as number,s as string));c.fillStyle=light;c.fillRect(left,top,width,height);
 const heel=c.createLinearGradient(0,1190,0,1300);heel.addColorStop(0,'#00000000');heel.addColorStop(1,'#00000033');c.fillStyle=heel;c.fillRect(left,1190,width,120);c.restore();
 // Rolled silver rim, recessed lid, scored opening and pull tab.
 const ellipse=(x:number,y:number,rx:number,ry:number,fill:string|CanvasGradient,stroke?:string)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke()}}
 ellipse(600,211,230,43,metal,'#75817a');ellipse(600,202,228,40,metal,'#f7faf5');ellipse(600,201,211,31,'#b6c1b9','#7e8b82');
 const lid=c.createLinearGradient(0,170,0,228);lid.addColorStop(0,'#dce4dd');lid.addColorStop(.5,'#a5b3a9');lid.addColorStop(1,'#e9eee7');ellipse(600,200,202,27,lid);
 ellipse(600,190,56,12,'#7f8d83','#aebcb1');ellipse(600,190,49,9,'#46534b');
 c.save();c.translate(600,208);c.rotate(-.12);c.fillStyle=metal;c.strokeStyle='#6d7a71';c.lineWidth=3;c.beginPath();c.roundRect(-34,-14,68,30,13);c.fill();c.stroke();ellipse(0,2,17,7,'#89978c');ellipse(0,-10,6,3,'#e2e9df');c.restore();
 c.beginPath();c.ellipse(600,1305,217,19,0,0,Math.PI);c.strokeStyle='#eff3ec';c.lineWidth=7;c.stroke();c.beginPath();c.ellipse(600,1311,211,15,0,0,Math.PI);c.strokeStyle='#748277';c.lineWidth=3;c.stroke();
}
