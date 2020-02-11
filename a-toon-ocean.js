/* global AFRAME, THREE */

import { Voronoi, relaxCells, distance } from './voronoi.js';
const {
  WebGLRenderTarget,
  RGBFormat,
  NearestFilter,
  DepthTexture,
  UnsignedShortType,
  ShaderMaterial,
  TextureLoader,
  RepeatWrapping,
  Vector2,
  MeshBasicMaterial,
  MeshDepthMaterial,
  CanvasTexture
} = THREE;


const depthMaterial = new MeshBasicMaterial({
  colorWrite: false
});

const target = new WebGLRenderTarget( 100, 100 );
target.texture.format = RGBFormat;
target.texture.generateMipmaps = true;
target.stencilBuffer = false;
target.depthBuffer = true;
target.depthTexture = new DepthTexture();
target.depthTexture.type = UnsignedShortType;

function lerp(p1,p2,t=0.5) {
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
  }
}

function generateCausticCanvasTexture(nPoints) {
  const voronoi = new Voronoi();
  const originalSites = [];
  const width = 512;
  const height = 512;
  const targetGap = width/55;
  const bbox = {xl: -width, xr: width*2, yt: -height, yb: height*2}; // xl is x-left, xr is x-right, yt is y-top, and yb is y-bottom
  for (let i=0;i<nPoints-3;i++) originalSites.push({
    x: Math.random() * width,
    y: Math.random() * height,
  });
  originalSites.push(...relaxCells(voronoi.compute(originalSites.splice(0), bbox).cells));
  for (let i=0;i<3;i++) originalSites.push({
    x: Math.random() * width,
    y: Math.random() * height,
  });
  const sites = [];
  for (let i=-1;i<=1;i++) {
    for (let j=-1;j<=1;j++) {
      for (const site of originalSites) {
        sites.push({
          x: site.x + width*i,
          y: site.y + height*j,
        });
      }
    }
  }
  const shapes = voronoi.compute(sites, bbox);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
  svg.setAttribute('xmlns', "http://www.w3.org/2000/svg");
  svg.setAttribute('viewBox', `${0} ${0} ${width} ${height}`);
  svg.setAttribute('style', `width:${width}px; height:${height}px; position: absolute;`);
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.innerHTML = `
  <rect x="0" y="0" width="100%" height="100%" fill="white" />
  <defs>
    <filter id="goo">
        <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="10"></feGaussianBlur>
        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo"></feColorMatrix>
        <feComposite in="SourceGraphic" in2="goo" operator="atop"></feComposite>
    </filter>
    <filter id="goo2">
        <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="4"></feGaussianBlur>
        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 14 -8" result="goo"></feColorMatrix>
        <feComposite in="SourceGraphic" in2="goo" operator="atop"></feComposite>
    </filter>
    <filter id="displacementFilter">
      <feTurbulence type="turbulence" baseFrequency="0.025" stitchTiles="stitch"
          numOctaves="1" result="turbulence"/>
      <feGaussianBlur in="turbulence" result="blur" stdDeviation="10"></feGaussianBlur>
      <feDisplacementMap in2="blur" in="SourceGraphic"
          scale="${width/13}" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
  <g style="filter: url(#goo2);"></g>
  `;
  const g = svg.querySelector('g');
  for (const cell of shapes.cells) {
    if (!cell.halfedges[0]) continue;
    const p = document.createElementNS("http://www.w3.org/2000/svg", 'polygon');
    const vertices = [];
    vertices.push(cell.halfedges[0].getStartpoint());
    for (const halfEdge of cell.halfedges) {
      vertices.push(halfEdge.getEndpoint());
    }
    p.setAttribute('points', vertices.map(vertex => {
      const t = 1 - targetGap/Math.max(distance(cell.site, vertex), targetGap);
      return lerp(cell.site, vertex, t)
    }).map(vertex => `${vertex.x},${vertex.y}`).join(' '));
    p.setAttribute('style', "fill:black;stroke-width:0;filter:url(#goo);");
    g.appendChild(p);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const canvasTexture = new CanvasTexture(canvas);
  canvasTexture.wrapS = canvasTexture.wrapT = RepeatWrapping;
  const img = document.createElement('img');
  const blob = new Blob([svg.outerHTML], {type: 'image/svg+xml'});
  const url = URL.createObjectURL(blob);
  img.onload = function() {
    canvas.getContext('2d').drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvasTexture.needsUpdate = true;
  }
  img.src = url;     
  
  return canvasTexture;
}

AFRAME.registerShader('toon-ocean', {
  schema: {
    resolution: {type: 'vec2', is: 'uniform'},
    depth_map: {type: 'map', is: 'uniform'},
    map: {type: 'map', is: 'uniform'},
    camera_near: {default: 0.1, is: 'uniform'},
    camera_far: {default: 50, is: 'uniform'},
    uTime: {type: 'time', is: 'uniform'},
    color_foam: {type: 'color', is: 'uniform', default: '#ffffff'},
    color_shallow: {type: 'color', is: 'uniform', default: 'rgb(140, 220, 255)'},
    color_deep: {type: 'color', is: 'uniform', default: 'rgb(0, 57, 115)'},
    opacity_shallow: { is: 'uniform', default: 0.2 },
    opacity_deep: { is: 'uniform', default: 1.0 },
    opacity_foam: { is: 'uniform', default: 0.6 },
    repeat: { is: 'uniform', default: 10 },
    max_depth: { is: 'uniform', default: 3 }
  },
  fragmentShader: `
    #include <packing>

    varying vec2 vUv;
    varying vec3 viewZ;
    uniform vec2 resolution;
    uniform sampler2D depth_map;
    uniform sampler2D map;
    uniform float camera_near;
    uniform float camera_far;
    uniform float uTime;
    uniform float repeat;
    uniform vec3 color_foam;
    uniform vec3 color_shallow;
    uniform vec3 color_deep;
    uniform float opacity_shallow;
    uniform float opacity_deep;
    uniform float opacity_foam;
    uniform float max_depth;

    float readDepth( sampler2D depthSampler, vec2 coord ) {
      float fragCoordZ = texture2D( depthSampler, coord ).x;
      float viewZ = perspectiveDepthToViewZ( fragCoordZ, camera_near, camera_far );
      return viewZToOrthographicDepth( viewZ, camera_near, camera_far );
    }

    void main() {
      float time = uTime * 0.001;
      float distanceDark = 8.0;
      float distanceLight = 12.0;
      float max_depth = 3.0;

      // Depth of point on ocean surface
      float depth2 = viewZ.z;

      // Normalised depth of scene betweet 0 and 1
      float depth = readDepth( depth_map, (gl_FragCoord.xy/resolution.xy) );

      // Depth of scene in range of camera
      float depth1 = mix( camera_near, camera_far, depth);

      vec4 col1 = vec4( color_shallow, opacity_shallow );
      vec4 col2 = vec4( color_deep, opacity_deep );

      vec4 darkFoam = 1.0 - 0.2*smoothstep(distanceDark, 0.0,depth2)*texture2D(map,
        (vUv + vec2(0.5,0)) * repeat*1.25 +
        (2.0/repeat*1.25) * vec2(sin(10.0*repeat*1.25*vUv.x), cos(10.0*repeat*1.25*vUv.y))
      );
      vec4 lightFoam = texture2D(map, vUv * repeat +
        (1.0/repeat) * vec2(sin(time*2.0+repeat*10.0*vUv.x), cos(time*2.0+repeat*10.0*vUv.y)) +
        (2.0/repeat) * vec2(sin(repeat*20.0*vUv.x), cos(repeat*20.0*vUv.y))
      ) * 0.5 * smoothstep(distanceLight, 0.0,depth2);

      if (depth1 - depth2 < 0.2) {
        gl_FragColor = vec4(color_foam,opacity_foam * smoothstep(0.0,0.1,depth1 - depth2));
      } else {
        vec4 depthCol;
        float transition = smoothstep(0.2 , 0.3, depth1 - depth2);
        if (depth1 - depth2 < max_depth) {
          float refracdepth_map = mix( camera_near, camera_far, readDepth( depth_map, (gl_FragCoord.xy + vec2(3.0 * sin(time + 0.1*gl_FragCoord.y),0))/resolution.xy ));
          depthCol = 1.5 * mix(0.5 * col1, col2, smoothstep(0.0, max_depth, refracdepth_map - depth2));
        } else {
          depthCol = 1.5 * mix(0.5 * col1, col2, smoothstep(0.0, max_depth, depth1 - depth2));
        }
        gl_FragColor = mix(vec4(color_foam,opacity_foam), depthCol * darkFoam + lightFoam, transition);
      }
  }`,
  vertexShader: `
    varying vec2 vUv;
    varying vec3 viewZ;
    uniform float uTime;

    void main() {
      float time = uTime * 0.001;
      vUv = uv;
      vec3 newPos = position.xyz;
      newPos.z += 0.08*sin(time/1.8 + uv.y*20.0) + 0.08 * cos(time/2.0 + uv.x*20.0);
      viewZ = -(modelViewMatrix * vec4(newPos, 1.)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
    }
  `
});

function powerOfTwo(x) {
  return Math.pow(2, Math.floor(Math.log(x)/Math.log(2)));
}

const temp = new Vector2();
AFRAME.registerComponent('toon-ocean', {
  schema: {},
  
  init () {
    const material = this.el.components.material.material;
    this.el.setAttribute('material', 'depth_map', target.depthTexture);
    this.el.setAttribute('material', 'map', generateCausticCanvasTexture(10));
    this.el.sceneEl.object3D.onBeforeRender = this.beforeRender.bind(this);
  },

  beforeRender (r,s,camera) {
    const renderer = this.el.sceneEl.renderer;
    const scene = this.el.sceneEl.object3D;
    const material = this.el.components.material.material;
    const thisObject = this.el.object3D;
    
    if(!thisObject.visible) return;
    
    const cameras = camera.cameras || [camera];

    thisObject.visible = false;
    scene.overrideMaterial = depthMaterial;
    renderer.getDrawingBufferSize(temp);
      
    var vrEnabled = renderer.xr.enabled;
    renderer.xr.enabled = false;
    renderer.autoClearDepth = false;
    renderer.autoClearColor = false;
    
    
    this.el.setAttribute('material', 'resolution', `${temp.x} ${temp.y}`);
    target.setSize( temp.x, temp.y );
    
    this.el.setAttribute('material', 'camera_near', camera.near);
    this.el.setAttribute('material', 'camera_far', camera.far);
    renderer.setRenderTarget( target );
    
    renderer.clearDepth();
    renderer.clearColor();
    scene.autoUpdate = false;
    
    
    
    renderer.render( scene, camera );
    
    scene.autoUpdate = true;
    
    thisObject.visible = true;
    renderer.setRenderTarget( null );
    
    renderer.xr.enabled = vrEnabled;
    renderer.autoClearDepth = true;
    renderer.autoClearColor = true;
    
    scene.overrideMaterial = null;
    delete scene.isRendering;
  }
});

AFRAME.registerPrimitive('a-toon-ocean', {
  defaultComponents: {
    geometry: {
      primitive: 'plane',
      height: 10,
      width: 10,
      segmentsHeight: 10,
      segmentsWidth: 10,
    },
    material: {
      shader: 'toon-ocean',
      transparent: true,
      color_foam: 'white',
      color_deep: 'darkblue',
      color_shallow: 'lavenderblush',
      repeat: '10',
    },
    "toon-ocean": {}
  },
  mappings: {
    repeat: 'material.repeat',
    color_foam: 'material.color_foam',
    color_deep: 'material.color_deep',
    color_shallow: 'material.color_shallow',
    opacity_deep: 'material.opacity_deep',
    opacity_shallow: 'material.opacity_shallow',
    opacity_foam: 'material.opacity_foam',
    map: 'material.map',
    height: 'geometry.height',
    width: 'geometry.width',
    depth: 'material.max_depth'
  }
});